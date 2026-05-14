import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { distributionNoticeEmail } from "@/lib/email-templates";
import { Prisma } from "@prisma/client";

// GET all distributions for an investment (across all client positions)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const distributions = await prisma.distribution.findMany({
      where: {
        clientInvestment: { investmentId: id, deletedAt: null },
        deletedAt: null,
      },
      orderBy: { date: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        clientInvestment: {
          select: { id: true, amountInvested: true },
        },
      },
    });

    return NextResponse.json(distributions);
  } catch (error) {
    console.error("Error fetching distributions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: bulk import CSV or pro-rata allocation
// Body: { mode: "csv", rows: [...] } or { mode: "prorate", totalAmount, date, type?, description? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();

    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    if (body.mode === "prorate") {
      return handleProRata(user.id, id, investment.name, body, request);
    }

    // Default: CSV bulk import
    return handleBulkImport(user.id, id, investment.name, body, request);
  } catch (error) {
    console.error("Error in bulk distribution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleBulkImport(
  adminId: string,
  investmentId: string,
  investmentName: string,
  body: { rows: Array<{ email?: string; userId?: string; amount: number | string; date: string; type?: string; description?: string }> },
  request: Request
) {
  const { rows } = body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "rows array is required and must not be empty" },
      { status: 400 }
    );
  }

  // Validate all rows upfront
  const errors: string[] = [];
  const parsed: Array<{
    email?: string;
    userId?: string;
    amount: number;
    date: string;
    type: string;
    description: string | null;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const amt = parseFloat(String(row.amount));
    if (isNaN(amt) || amt <= 0) {
      errors.push(`Row ${i + 1}: invalid amount`);
      continue;
    }
    if (!row.date || isNaN(new Date(row.date).getTime())) {
      errors.push(`Row ${i + 1}: invalid date`);
      continue;
    }
    if (!row.email && !row.userId) {
      errors.push(`Row ${i + 1}: email or userId required`);
      continue;
    }
    parsed.push({
      email: row.email,
      userId: row.userId,
      amount: amt,
      date: row.date,
      type: row.type || "CASH",
      description: row.description || null,
    });
  }

  if (errors.length > 0 && parsed.length === 0) {
    return NextResponse.json({ error: "All rows invalid", errors }, { status: 400 });
  }

  // Resolve users and positions
  const positions = await prisma.clientInvestment.findMany({
    where: { investmentId, deletedAt: null },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  const positionByEmail = new Map(
    positions.map((p) => [p.user.email.toLowerCase(), p])
  );
  const positionByUserId = new Map(positions.map((p) => [p.userId, p]));

  const created: string[] = [];
  const skipped: string[] = [];

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  for (const row of parsed) {
    const position = row.userId
      ? positionByUserId.get(row.userId)
      : row.email
        ? positionByEmail.get(row.email.toLowerCase())
        : undefined;

    if (!position) {
      skipped.push(`${row.email || row.userId}: no position in this investment`);
      continue;
    }

    const dist = await prisma.$transaction(async (tx) => {
      const d = await tx.distribution.create({
        data: {
          userId: position.userId,
          clientInvestmentId: position.id,
          amount: row.amount,
          date: new Date(row.date),
          type: row.type as "CASH" | "REINVESTMENT" | "RETURN_OF_CAPITAL",
          description: row.description,
          status: "COMPLETED",
        },
      });
      await tx.clientInvestment.update({
        where: { id: position.id },
        data: { cashDistributed: { increment: row.amount } },
      });
      return d;
    });

    created.push(dist.id);

    // Notify client
    await createNotification({
      userId: position.userId,
      type: "DISTRIBUTION_RECEIVED",
      title: "Distribution received",
      message: `A distribution of $${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} has been recorded for ${investmentName}`,
      link: `/investments/${position.id}`,
    });

    await sendEmail({
      to: position.user.email,
      subject: `Distribution recorded for ${investmentName}`,
      html: distributionNoticeEmail({
        userName: position.user.name || "Investor",
        investmentName,
        amount: `$${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        portalUrl: `${baseUrl}/investments/${position.id}`,
      }),
    });
  }

  await createAuditLog({
    userId: adminId,
    action: "BULK_IMPORT_DISTRIBUTIONS",
    targetType: "Investment",
    targetId: investmentId,
    details: { created: created.length, skipped: skipped.length },
    request,
  });

  return NextResponse.json({
    created: created.length,
    skipped,
    errors,
  });
}

async function handleProRata(
  adminId: string,
  investmentId: string,
  investmentName: string,
  body: { totalAmount: number | string; date: string; type?: string; description?: string },
  request: Request
) {
  const totalAmount = parseFloat(String(body.totalAmount));
  if (isNaN(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ error: "totalAmount must be positive" }, { status: 400 });
  }
  if (!body.date || isNaN(new Date(body.date).getTime())) {
    return NextResponse.json({ error: "Valid date is required" }, { status: 400 });
  }

  const positions = await prisma.clientInvestment.findMany({
    where: { investmentId, deletedAt: null, status: "ACTIVE" },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (positions.length === 0) {
    return NextResponse.json(
      { error: "No active positions in this investment" },
      { status: 400 }
    );
  }

  const totalDeployed = positions.reduce(
    (sum, p) => sum + Number(p.amountInvested),
    0
  );

  if (totalDeployed === 0) {
    return NextResponse.json(
      { error: "Total deployed capital is zero; cannot allocate pro-rata" },
      { status: 400 }
    );
  }

  // Calculate pro-rata shares with banker's rounding to ensure sum matches exactly
  const rawAllocations = positions.map((p) => ({
    position: p,
    rawAmount: (Number(p.amountInvested) / totalDeployed) * totalAmount,
  }));

  // Floor all to cents, then distribute remainders
  const allocations = rawAllocations.map((a) => ({
    ...a,
    amount: Math.floor(a.rawAmount * 100) / 100,
    remainder: (a.rawAmount * 100) % 1,
  }));

  let allocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  let remainingCents = Math.round((totalAmount - allocated) * 100);

  // Sort by remainder descending to distribute leftover cents
  allocations.sort((a, b) => b.remainder - a.remainder);
  for (const alloc of allocations) {
    if (remainingCents <= 0) break;
    alloc.amount += 0.01;
    remainingCents--;
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const created: string[] = [];

  for (const alloc of allocations) {
    if (alloc.amount <= 0) continue;

    const dist = await prisma.$transaction(async (tx) => {
      const d = await tx.distribution.create({
        data: {
          userId: alloc.position.userId,
          clientInvestmentId: alloc.position.id,
          amount: new Prisma.Decimal(alloc.amount.toFixed(2)),
          date: new Date(body.date),
          type: (body.type as "CASH" | "REINVESTMENT" | "RETURN_OF_CAPITAL") || "CASH",
          description: body.description || null,
          status: "COMPLETED",
        },
      });
      await tx.clientInvestment.update({
        where: { id: alloc.position.id },
        data: { cashDistributed: { increment: alloc.amount } },
      });
      return d;
    });

    created.push(dist.id);

    await createNotification({
      userId: alloc.position.userId,
      type: "DISTRIBUTION_RECEIVED",
      title: "Distribution received",
      message: `A distribution of $${alloc.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} has been recorded for ${investmentName}`,
      link: `/investments/${alloc.position.id}`,
    });

    await sendEmail({
      to: alloc.position.user.email,
      subject: `Distribution recorded for ${investmentName}`,
      html: distributionNoticeEmail({
        userName: alloc.position.user.name || "Investor",
        investmentName,
        amount: `$${alloc.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        portalUrl: `${baseUrl}/investments/${alloc.position.id}`,
      }),
    });
  }

  await createAuditLog({
    userId: adminId,
    action: "PRORATE_DISTRIBUTION",
    targetType: "Investment",
    targetId: investmentId,
    details: {
      totalAmount,
      date: body.date,
      positionsCount: created.length,
    },
    request,
  });

  return NextResponse.json({
    created: created.length,
    totalAllocated: allocations.reduce((sum, a) => sum + a.amount, 0),
  });
}

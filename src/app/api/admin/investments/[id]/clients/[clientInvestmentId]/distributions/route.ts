import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { distributionNoticeEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; clientInvestmentId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, clientInvestmentId } = await params;

    const position = await prisma.clientInvestment.findFirst({
      where: { id: clientInvestmentId, investmentId: id, deletedAt: null },
    });
    if (!position) {
      return NextResponse.json(
        { error: "Client investment position not found" },
        { status: 404 }
      );
    }

    const distributions = await prisma.distribution.findMany({
      where: { clientInvestmentId, deletedAt: null },
      orderBy: { date: "desc" },
      select: {
        id: true,
        amount: true,
        date: true,
        type: true,
        description: true,
        status: true,
        createdAt: true,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; clientInvestmentId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, clientInvestmentId } = await params;
    const body = await request.json();
    const { amount, date, type, description } = body;

    if (!amount || !date) {
      return NextResponse.json(
        { error: "Amount and date are required" },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const position = await prisma.clientInvestment.findFirst({
      where: { id: clientInvestmentId, investmentId: id, deletedAt: null },
      include: {
        user: { select: { id: true, email: true, name: true } },
        investment: { select: { id: true, name: true } },
      },
    });

    if (!position) {
      return NextResponse.json(
        { error: "Client investment position not found" },
        { status: 404 }
      );
    }

    const distribution = await prisma.$transaction(async (tx) => {
      const dist = await tx.distribution.create({
        data: {
          userId: position.userId,
          clientInvestmentId,
          amount: numAmount,
          date: new Date(date),
          type: type || "CASH",
          description: description || null,
          status: "COMPLETED",
        },
      });

      await tx.clientInvestment.update({
        where: { id: clientInvestmentId },
        data: {
          cashDistributed: { increment: numAmount },
        },
      });

      return dist;
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_DISTRIBUTION",
      targetType: "Distribution",
      targetId: distribution.id,
      details: {
        clientInvestmentId,
        investmentId: id,
        amount: numAmount,
        date,
        type: type || "CASH",
      },
      request,
    });

    // Notify client
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await createNotification({
      userId: position.userId,
      type: "DISTRIBUTION_RECEIVED",
      title: "Distribution received",
      message: `A distribution of $${numAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} has been recorded for ${position.investment.name}`,
      link: `/investments/${position.id}`,
    });

    const logoUrl = await getEmailLogoUrl();
    await sendEmail({
      to: position.user.email,
      subject: `Distribution recorded for ${position.investment.name}`,
      html: distributionNoticeEmail({
        userName: position.user.name || "Investor",
        investmentName: position.investment.name,
        amount: `$${numAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        portalUrl: `${baseUrl}/investments/${position.id}`,
        logoUrl,
      }),
    });

    return NextResponse.json(distribution, { status: 201 });
  } catch (error) {
    console.error("Error creating distribution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

// Valuations record the fund's total capacity/limit — they do NOT change
// client position values. These are fixed-value investments where returns
// come from distributions, not appreciation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function cascadeValuation(_investmentId: string, _totalValue: Prisma.Decimal) {
  // No-op: client position currentValue = amountInvested (fixed)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const valuations = await prisma.investmentValuation.findMany({
      where: { investmentId: id, deletedAt: null },
      orderBy: { date: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(valuations);
  } catch (error) {
    console.error("Error listing valuations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { date, totalValue, notes } = body;

    if (!date || totalValue == null) {
      return NextResponse.json(
        { error: "Date and total value are required" },
        { status: 400 }
      );
    }

    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const decimalValue = new Prisma.Decimal(totalValue);

    const valuation = await prisma.investmentValuation.create({
      data: {
        investmentId: id,
        date: new Date(date),
        totalValue: decimalValue,
        notes: notes || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Cascade to client investments
    await cascadeValuation(id, decimalValue);

    await createAuditLog({
      userId: user.id,
      action: "CREATE_INVESTMENT_VALUATION",
      targetType: "InvestmentValuation",
      targetId: valuation.id,
      details: { investmentId: id, totalValue, date },
      request,
    });

    return NextResponse.json(valuation, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A valuation already exists for this date" },
        { status: 409 }
      );
    }
    console.error("Error creating valuation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const result = await prisma.investmentValuation.updateMany({
      where: {
        id: { in: ids },
        investmentId: id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "BULK_DELETE_VALUATIONS",
      targetType: "InvestmentValuation",
      targetId: id,
      details: { investmentId: id, valuationIds: ids, deleted: result.count },
      request,
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting valuations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

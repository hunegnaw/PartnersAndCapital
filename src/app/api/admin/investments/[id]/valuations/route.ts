import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

async function cascadeValuation(investmentId: string, totalValue: Prisma.Decimal) {
  const clientInvestments = await prisma.clientInvestment.findMany({
    where: { investmentId, deletedAt: null, status: "ACTIVE" },
  });

  if (clientInvestments.length === 0) return;

  const totalInvested = clientInvestments.reduce(
    (sum, ci) => sum.add(ci.amountInvested),
    new Prisma.Decimal(0)
  );

  if (totalInvested.equals(0)) return;

  const updates = clientInvestments.map((ci) => {
    const share = ci.amountInvested.div(totalInvested);
    const currentValue = totalValue.mul(share);
    const totalReturn = currentValue.sub(ci.amountInvested);
    const returnPct = ci.amountInvested.equals(0)
      ? new Prisma.Decimal(0)
      : totalReturn.div(ci.amountInvested).mul(100);

    return prisma.clientInvestment.update({
      where: { id: ci.id },
      data: {
        currentValue,
        totalReturn,
        returnPercentage: returnPct,
      },
    });
  });

  await Promise.all(updates);
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

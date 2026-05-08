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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; valuationId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, valuationId } = await params;
    const body = await request.json();
    const { date, totalValue, notes } = body;

    const existing = await prisma.investmentValuation.findFirst({
      where: { id: valuationId, investmentId: id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Valuation not found" },
        { status: 404 }
      );
    }

    const data: Prisma.InvestmentValuationUpdateInput = {};
    if (date !== undefined) data.date = new Date(date);
    if (totalValue !== undefined) data.totalValue = new Prisma.Decimal(totalValue);
    if (notes !== undefined) data.notes = notes || null;

    const valuation = await prisma.investmentValuation.update({
      where: { id: valuationId },
      data,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Re-cascade if totalValue changed
    if (totalValue !== undefined) {
      await cascadeValuation(id, new Prisma.Decimal(totalValue));
    }

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_INVESTMENT_VALUATION",
      targetType: "InvestmentValuation",
      targetId: valuationId,
      details: { investmentId: id, changes: body },
      request,
    });

    return NextResponse.json(valuation);
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
    console.error("Error updating valuation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; valuationId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, valuationId } = await params;

    const existing = await prisma.investmentValuation.findFirst({
      where: { id: valuationId, investmentId: id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Valuation not found" },
        { status: 404 }
      );
    }

    await prisma.investmentValuation.update({
      where: { id: valuationId },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_INVESTMENT_VALUATION",
      targetType: "InvestmentValuation",
      targetId: valuationId,
      details: { investmentId: id },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting valuation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

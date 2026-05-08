import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/impersonation";
import { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();
    const { id } = await params;

    // Verify this client investment belongs to the user
    const clientInvestment = await prisma.clientInvestment.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
      select: {
        investmentId: true,
        amountInvested: true,
      },
    });

    if (!clientInvestment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    // Get all active client investments for this fund to calculate shares
    const allPositions = await prisma.clientInvestment.findMany({
      where: {
        investmentId: clientInvestment.investmentId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { amountInvested: true },
    });

    const totalInvested = allPositions.reduce(
      (sum, ci) => sum.add(ci.amountInvested),
      new Prisma.Decimal(0)
    );

    const clientShare = totalInvested.equals(0)
      ? new Prisma.Decimal(0)
      : clientInvestment.amountInvested.div(totalInvested);

    // Get all valuations for the underlying investment
    const valuations = await prisma.investmentValuation.findMany({
      where: {
        investmentId: clientInvestment.investmentId,
        deletedAt: null,
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        totalValue: true,
      },
    });

    // Calculate client's proportional value at each date
    const data = valuations.map((v) => ({
      date: v.date,
      value: Number(v.totalValue.mul(clientShare).toFixed(2)),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching valuation history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

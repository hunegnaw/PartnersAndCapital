import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// Allocation color mapping
const ASSET_CLASS_COLORS: Record<string, string> = {
  "Oil & Gas": "#b8860b",
  "Real Estate": "#1e3a5f",
  "Private Credit": "#4a5568",
  Specialty: "#a0aec0",
};

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    // Get user's active client investments with asset class info
    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { userId: user.id, deletedAt: null },
      include: {
        investment: {
          include: { assetClass: true },
        },
      },
    });

    // KPIs
    const totalInvested = clientInvestments.reduce(
      (sum, ci) => sum + Number(ci.amountInvested),
      0
    );
    const currentValue = clientInvestments.reduce(
      (sum, ci) => sum + Number(ci.currentValue),
      0
    );
    const activeInvestments = clientInvestments.filter(
      (ci) => ci.status === "ACTIVE"
    ).length;
    const totalGain = currentValue - totalInvested;
    const totalReturnPct =
      totalInvested > 0
        ? Math.round((totalGain / totalInvested) * 10000) / 100
        : 0;

    // Total completed distributions
    const distributions = await prisma.distribution.findMany({
      where: {
        userId: user.id,
        status: "COMPLETED",
        deletedAt: null,
      },
    });
    const totalDistributions = distributions.reduce(
      (sum, d) => sum + Number(d.amount),
      0
    );

    // Weighted average IRR
    let weightedIrr = 0;
    let totalWeight = 0;
    for (const ci of clientInvestments) {
      if (ci.irr != null) {
        const weight = Number(ci.amountInvested);
        weightedIrr += Number(ci.irr) * weight;
        totalWeight += weight;
      }
    }
    const netIRR = totalWeight > 0 ? Math.round((weightedIrr / totalWeight) * 100) / 100 : 0;

    // Allocation by asset class
    const allocationMap = new Map<
      string,
      { name: string; value: number }
    >();
    for (const ci of clientInvestments) {
      const className = ci.investment.assetClass.name;
      const existing = allocationMap.get(className) || {
        name: className,
        value: 0,
      };
      existing.value += Number(ci.currentValue);
      allocationMap.set(className, existing);
    }
    const totalAllocationValue = Array.from(allocationMap.values()).reduce(
      (sum, a) => sum + a.value,
      0
    );
    const allocation = Array.from(allocationMap.values()).map((a) => ({
      name: a.name,
      value: a.value,
      percentage:
        totalAllocationValue > 0
          ? Math.round((a.value / totalAllocationValue) * 10000) / 100
          : 0,
      color: ASSET_CLASS_COLORS[a.name] || "#718096",
    }));

    // Growth data: last 12 months of portfolio value
    const now = new Date();
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );

    const [contributions, allDistributions] = await Promise.all([
      prisma.contribution.findMany({
        where: {
          userId: user.id,
          status: "COMPLETED",
          deletedAt: null,
          date: { gte: twelveMonthsAgo },
        },
        orderBy: { date: "asc" },
      }),
      prisma.distribution.findMany({
        where: {
          userId: user.id,
          status: "COMPLETED",
          deletedAt: null,
          date: { gte: twelveMonthsAgo },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build monthly cumulative data
    const monthlyData: {
      month: string;
      contributions: number;
      distributions: number;
      netValue: number;
    }[] = [];

    // Compute baseline (value before the 12-month window)
    const priorContributions = await prisma.contribution.aggregate({
      where: {
        userId: user.id,
        status: "COMPLETED",
        deletedAt: null,
        date: { lt: twelveMonthsAgo },
      },
      _sum: { amount: true },
    });
    const priorDistributions = await prisma.distribution.aggregate({
      where: {
        userId: user.id,
        status: "COMPLETED",
        deletedAt: null,
        date: { lt: twelveMonthsAgo },
      },
      _sum: { amount: true },
    });

    let cumulative =
      Number(priorContributions._sum.amount || 0) -
      Number(priorDistributions._sum.amount || 0);

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(
        twelveMonthsAgo.getFullYear(),
        twelveMonthsAgo.getMonth() + i,
        1
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

      const monthContribs = contributions
        .filter((c) => c.date >= monthDate && c.date <= monthEnd)
        .reduce((sum, c) => sum + Number(c.amount), 0);

      const monthDists = allDistributions
        .filter((d) => d.date >= monthDate && d.date <= monthEnd)
        .reduce((sum, d) => sum + Number(d.amount), 0);

      cumulative += monthContribs - monthDists;

      monthlyData.push({
        month: monthKey,
        contributions: monthContribs,
        distributions: monthDists,
        netValue: cumulative,
      });
    }

    // Recent investments with amountInvested
    const recentInvestments = clientInvestments
      .filter((ci) => ci.status === "ACTIVE")
      .map((ci) => ({
        id: ci.id,
        investment: {
          name: ci.investment.name,
          assetClass: { name: ci.investment.assetClass.name },
        },
        amountInvested: Number(ci.amountInvested),
        currentValue: Number(ci.currentValue),
        returnPercentage: Number(ci.returnPercentage),
        status: ci.status,
      }));

    // Recent documents (last 5)
    const clientInvestmentIds = clientInvestments.map((ci) => ci.investmentId);
    const recentDocuments = await prisma.document.findMany({
      where: {
        deletedAt: null,
        OR: [
          { userId: user.id },
          { investmentId: { in: clientInvestmentIds } },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        year: true,
        createdAt: true,
        mimeType: true,
        investment: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Recent activity (broadcasts + targeted to user, last 5)
    const recentActivity = await prisma.activityFeed.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isBroadcast: true },
          { targetUserId: user.id },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        isBroadcast: true,
        createdAt: true,
        author: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Last updated timestamp
    const lastUpdated = now.toISOString();

    return NextResponse.json({
      totalInvested,
      currentValue,
      totalDistributions,
      activeInvestments,
      totalGain,
      totalReturnPct,
      netIRR,
      allocation,
      growth: monthlyData,
      recentInvestments,
      recentDocuments,
      recentActivity,
      lastUpdated,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

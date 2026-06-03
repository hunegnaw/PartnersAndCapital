import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/impersonation";

// Allocation color mapping (brand palette)
const ASSET_CLASS_COLORS: Record<string, string> = {
  "Oil & Gas": "#B07D3A",
  "Real Estate": "#1A2640",
  "Private Credit": "#2C3E5C",
  "Specialty Assets": "#7A5520",
  Specialty: "#7A5520",
};

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    // Get user's active client investments with asset class info
    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { userId, deletedAt: null, investment: { deletedAt: null } },
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

    // Total completed distributions (only from active investments)
    const distributions = await prisma.distribution.findMany({
      where: {
        userId,
        status: "COMPLETED",
        deletedAt: null,
        clientInvestment: { deletedAt: null, investment: { deletedAt: null } },
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

    // Allocation by individual investment (fund)
    // Gold shades for Oil & Gas + Real Estate, Navy shades for Private Credit + Specialty
    const GOLD_SHADES = ["#B07D3A", "#7A5528", "#4A3818", "#E8D5B0", "#FDF5E8"];
    const NAVY_SHADES = ["#1A2640", "#2C3E5C", "#406984", "#0D1428", "#8599B8", "#C5CCE8"];
    const goldCounter = { i: 0 };
    const navyCounter = { i: 0 };

    const investmentAllocMap = new Map<string, { name: string; value: number; assetClass: string }>();
    for (const ci of clientInvestments) {
      const investName = ci.investment.name;
      const existing = investmentAllocMap.get(investName) || {
        name: investName,
        value: 0,
        assetClass: ci.investment.assetClass.name,
      };
      existing.value += Number(ci.currentValue);
      investmentAllocMap.set(investName, existing);
    }
    const investmentAllocation = Array.from(investmentAllocMap.values()).map((a) => {
      const isGold = a.assetClass === "Oil & Gas" || a.assetClass === "Real Estate";
      const color = isGold
        ? GOLD_SHADES[goldCounter.i++ % GOLD_SHADES.length]
        : NAVY_SHADES[navyCounter.i++ % NAVY_SHADES.length];
      return {
        name: a.name,
        value: a.value,
        percentage:
          totalAllocationValue > 0
            ? Math.round((a.value / totalAllocationValue) * 10000) / 100
            : 0,
        color,
      };
    });

    // Growth data: reconstruct historical portfolio value from valuations
    const now = new Date();
    const investmentIds = clientInvestments.map((ci) => ci.investmentId);

    const earliestContribution = investmentIds.length > 0
      ? await prisma.contribution.findFirst({
          where: {
            userId,
            status: "COMPLETED",
            deletedAt: null,
            clientInvestment: { investmentId: { in: investmentIds }, deletedAt: null },
          },
          orderBy: { date: "asc" },
          select: { date: true },
        })
      : null;

    const monthlyData: {
      month: string;
      netValue: number;
      cumulativeDistributions: number;
    }[] = [];

    if (earliestContribution && investmentIds.length > 0) {
      const [allContributions, allValuations, userDistributions] = await Promise.all([
        prisma.contribution.findMany({
          where: {
            clientInvestment: { investmentId: { in: investmentIds }, deletedAt: null },
            status: "COMPLETED",
            deletedAt: null,
          },
          select: {
            userId: true,
            amount: true,
            date: true,
            clientInvestment: { select: { investmentId: true } },
          },
          orderBy: { date: "asc" },
        }),
        prisma.investmentValuation.findMany({
          where: { investmentId: { in: investmentIds }, deletedAt: null },
          select: { investmentId: true, date: true, totalValue: true },
          orderBy: { date: "asc" },
        }),
        prisma.distribution.findMany({
          where: {
            userId,
            status: "COMPLETED",
            deletedAt: null,
            clientInvestment: { investmentId: { in: investmentIds }, deletedAt: null },
          },
          select: { amount: true, date: true },
          orderBy: { date: "asc" },
        }),
      ]);

      // Index contributions and valuations by investment
      const contribsByInv = new Map<string, Array<{ userId: string; amount: number; date: Date }>>();
      for (const c of allContributions) {
        const invId = c.clientInvestment.investmentId;
        if (!contribsByInv.has(invId)) contribsByInv.set(invId, []);
        contribsByInv.get(invId)!.push({ userId: c.userId, amount: Number(c.amount), date: c.date });
      }

      const valsByInv = new Map<string, Array<{ date: Date; totalValue: number }>>();
      for (const v of allValuations) {
        if (!valsByInv.has(v.investmentId)) valsByInv.set(v.investmentId, []);
        valsByInv.get(v.investmentId)!.push({ date: v.date, totalValue: Number(v.totalValue) });
      }

      // Build month-by-month from earliest contribution to now
      const startDate = new Date(
        earliestContribution.date.getFullYear(),
        earliestContribution.date.getMonth(),
        1
      );
      const endDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

        let portfolioValue = 0;

        for (const invId of investmentIds) {
          const contribs = contribsByInv.get(invId) || [];
          const valuations = valsByInv.get(invId) || [];

          // User's cumulative contributions up to this month
          let userCum = 0;
          for (const c of contribs) {
            if (c.date <= monthEnd && c.userId === userId) userCum += c.amount;
          }
          if (userCum === 0) continue;

          // All clients' cumulative contributions up to this month
          let totalCum = 0;
          for (const c of contribs) {
            if (c.date <= monthEnd) totalCum += c.amount;
          }

          // Latest valuation on or before this month
          let fundValue: number | null = null;
          for (let i = valuations.length - 1; i >= 0; i--) {
            if (valuations[i].date <= monthEnd) {
              fundValue = valuations[i].totalValue;
              break;
            }
          }

          // No valuation yet = use total contributions as fund value (no appreciation)
          const effectiveFundValue = fundValue !== null ? fundValue : totalCum;
          const share = totalCum > 0 ? userCum / totalCum : 0;
          portfolioValue += effectiveFundValue * share;
        }

        // Cumulative distributions up to this month
        let cumDist = 0;
        for (const d of userDistributions) {
          if (d.date <= monthEnd) cumDist += Number(d.amount);
        }

        monthlyData.push({
          month: monthKey,
          netValue: Math.round(portfolioValue * 100) / 100,
          cumulativeDistributions: Math.round(cumDist * 100) / 100,
        });

        cursor.setMonth(cursor.getMonth() + 1);
      }

      // Pin final month to actual current values for consistency with KPI cards
      if (monthlyData.length > 0) {
        monthlyData[monthlyData.length - 1].netValue = currentValue;
        monthlyData[monthlyData.length - 1].cumulativeDistributions = totalDistributions;
      }
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
          { userId },
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
          { targetUserId: userId },
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
      investmentAllocation,
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

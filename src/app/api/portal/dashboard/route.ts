import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      kpis: {
        totalInvested,
        currentValue,
        totalDistributions,
        activeInvestments,
      },
      allocation,
      growth: monthlyData,
      recentDocuments,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";

export interface StatementInvestmentData {
  investmentName: string;
  assetClassName: string;
  amountInvested: number;
  currentValue: number;
  cashDistributed: number;
  returnPercentage: number;
  irr: number | null;
  apr: number | null;
  recentActivity: {
    date: Date;
    description: string;
    paymentMethod: string;
    amount: number;
    type: "contribution" | "distribution";
  }[];
  previousActivity: {
    date: Date;
    description: string;
    paymentMethod: string;
    amount: number;
    type: "contribution" | "distribution";
  }[];
  totalDepositsYTD: number;
  totalDistributionsYTD: number;
  chartData: {
    month: string;
    value: number;
    distributions: number;
    monthlyContribution: number;
    monthlyDistribution: number;
  }[];
  commentary: string | null;
  commentaryTitle: string | null;
  upcomingDistributions: {
    expectedDate: Date;
    amount: number | null;
    description: string | null;
  }[];
}

export interface StatementData {
  clientName: string;
  clientEmail: string;
  statementDate: string;
  periodStart: Date;
  periodEnd: Date;
  totalInvested: number;
  currentValue: number;
  totalDistributions: number;
  totalReturnPct: number;
  weightedIrr: number;
  weightedApr: number;
  investments: StatementInvestmentData[];
  combinedChartData: {
    month: string;
    netValue: number;
    cumulativeDistributions: number;
    monthlyDistribution: number;
    monthlyContribution: number;
  }[];
  allocation: {
    name: string;
    value: number;
    color: string;
  }[];
  investmentAllocation: {
    name: string;
    value: number;
    color: string;
  }[];
  banners: {
    title: string;
    description: string | null;
    imageUrl: string | null;
    buttonText: string | null;
    buttonUrl: string | null;
    gradientFrom: string;
    gradientTo: string;
  }[];
  disclosures: {
    title: string;
    body: string;
  }[];
  org: {
    name: string;
    legalName: string | null;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
  };
}

export async function collectStatementData(
  userId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<StatementData> {
  const periodMonth = periodStart.getMonth() + 1;
  const periodYear = periodStart.getFullYear();

  const threeMonthsAgo = new Date(periodStart);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const ytdStart = new Date(periodYear, 0, 1);

  const [user, org, disclosures, clientInvestments] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.organization.findFirst({
      select: {
        name: true,
        legalName: true,
        logoUrl: true,
        email: true,
        phone: true,
        website: true,
        address: true,
      },
    }),
    prisma.statementDisclosure.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.clientInvestment.findMany({
      where: { userId, deletedAt: null, investment: { deletedAt: null } },
      include: {
        investment: { include: { assetClass: true } },
      },
    }),
  ]);

  const bannerAssignments = await prisma.statementBannerAssignment.findMany({
    where: {
      month: periodMonth,
      year: periodYear,
      OR: [{ userId }, { userId: null }],
      banner: { deletedAt: null, isArchived: false },
    },
    include: { banner: true },
    orderBy: { createdAt: "asc" },
  });

  const uniqueBanners = new Map<string, typeof bannerAssignments[0]["banner"]>();
  for (const a of bannerAssignments) {
    if (!uniqueBanners.has(a.bannerId)) {
      uniqueBanners.set(a.bannerId, a.banner);
    }
  }

  let totalInvested = 0;
  let totalDistributions = 0;
  let weightedIrr = 0;
  let weightedApr = 0;
  let totalWeight = 0;
  const investmentsData: StatementInvestmentData[] = [];

  const allMonthlyData: Map<
    string,
    { netValue: number; cumDist: number; monthDist: number; monthContrib: number }
  > = new Map();

  for (const ci of clientInvestments) {
    const invested = Number(ci.amountInvested);
    const currentVal = invested;
    const cashDist = Number(ci.cashDistributed);
    totalInvested += invested;
    totalDistributions += cashDist;

    if (ci.irr != null) {
      weightedIrr += Number(ci.irr) * invested;
      totalWeight += invested;
    }
    if (ci.adminApr != null) {
      weightedApr += Number(ci.adminApr) * invested;
    }

    const [recentContribs, recentDistros, prevContribs, prevDistros, ytdDistros, allContribs, allDistros] =
      await Promise.all([
        prisma.contribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
            date: { gte: periodStart, lte: periodEnd },
          },
          orderBy: { date: "desc" },
        }),
        prisma.distribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
            date: { gte: periodStart, lte: periodEnd },
          },
          orderBy: { date: "desc" },
        }),
        prisma.contribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
            date: { gte: threeMonthsAgo, lt: periodStart },
          },
          orderBy: { date: "desc" },
        }),
        prisma.distribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
            date: { gte: threeMonthsAgo, lt: periodStart },
          },
          orderBy: { date: "desc" },
        }),
        prisma.distribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
            date: { gte: ytdStart, lte: periodEnd },
          },
        }),
        prisma.contribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
          },
          orderBy: { date: "asc" },
        }),
        prisma.distribution.findMany({
          where: {
            clientInvestmentId: ci.id,
            deletedAt: null,
            status: "COMPLETED",
          },
          orderBy: { date: "asc" },
        }),
      ]);

    const recentActivity = [
      ...recentContribs.map((c) => ({
        date: c.date,
        description: c.description || "Contribution",
        paymentMethod: "ELECTRONIC",
        amount: Number(c.amount),
        type: "contribution" as const,
      })),
      ...recentDistros.map((d) => ({
        date: d.date,
        description: d.description || "Distribution",
        paymentMethod: "ELECTRONIC",
        amount: Number(d.amount),
        type: "distribution" as const,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const previousActivity = [
      ...prevContribs.map((c) => ({
        date: c.date,
        description: c.description || "Contribution",
        paymentMethod: "ELECTRONIC",
        amount: Number(c.amount),
        type: "contribution" as const,
      })),
      ...prevDistros.map((d) => ({
        date: d.date,
        description: d.description || "Distribution",
        paymentMethod: "ELECTRONIC",
        amount: Number(d.amount),
        type: "distribution" as const,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const totalDistributionsYTD = ytdDistros.reduce((s, d) => s + Number(d.amount), 0);
    const totalDepositsYTD = allContribs
      .filter((c) => c.date >= ytdStart && c.date <= periodEnd)
      .reduce((s, c) => s + Number(c.amount), 0);

    const investmentDate = ci.investmentDate || ci.createdAt;
    const chartStart = new Date(
      new Date(investmentDate).getFullYear(),
      new Date(investmentDate).getMonth(),
      1
    );
    const chartEnd = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
    const miniChartData: { month: string; value: number; distributions: number; monthlyContribution: number; monthlyDistribution: number }[] = [];
    const cursor = new Date(chartStart);

    while (cursor <= chartEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

      let cumContrib = 0;
      let mContrib = 0;
      for (const c of allContribs) {
        if (c.date <= monthEnd) cumContrib += Number(c.amount);
        if (c.date >= monthStart && c.date <= monthEnd) mContrib += Number(c.amount);
      }
      let cumDist = 0;
      let mDist = 0;
      for (const d of allDistros) {
        if (d.date <= monthEnd) cumDist += Number(d.amount);
        if (d.date >= monthStart && d.date <= monthEnd) mDist += Number(d.amount);
      }

      miniChartData.push({
        month: monthKey,
        value: Math.min(cumContrib, invested),
        distributions: cumDist,
        monthlyContribution: mContrib,
        monthlyDistribution: mDist,
      });

      const existing = allMonthlyData.get(monthKey) || {
        netValue: 0,
        cumDist: 0,
        monthDist: 0,
        monthContrib: 0,
      };

      existing.netValue += Math.min(cumContrib, invested);
      existing.cumDist += cumDist;
      existing.monthDist += mDist;
      existing.monthContrib += mContrib;
      allMonthlyData.set(monthKey, existing);

      cursor.setMonth(cursor.getMonth() + 1);
    }

    const [invCommentary, invUpcoming] = await Promise.all([
      prisma.statementCommentary.findUnique({
        where: { investmentId_month_year: { investmentId: ci.investmentId, month: periodMonth, year: periodYear } },
      }),
      prisma.statementUpcomingDistribution.findMany({
        where: { investmentId: ci.investmentId, month: periodMonth, year: periodYear },
        orderBy: { expectedDate: "asc" },
      }),
    ]);

    investmentsData.push({
      investmentName: ci.investment.name,
      assetClassName: ci.investment.assetClass.name,
      amountInvested: invested,
      currentValue: currentVal,
      cashDistributed: cashDist,
      returnPercentage: invested > 0 ? Math.round((cashDist / invested) * 10000) / 100 : 0,
      irr: ci.irr != null ? Number(ci.irr) : null,
      apr: ci.adminApr != null ? Number(ci.adminApr) : null,
      recentActivity,
      previousActivity,
      totalDepositsYTD: totalDepositsYTD,
      totalDistributionsYTD,
      chartData: miniChartData,
      commentary: invCommentary?.body || null,
      commentaryTitle: invCommentary?.title || null,
      upcomingDistributions: invUpcoming.map((d) => ({
        expectedDate: d.expectedDate,
        amount: d.amount ? Number(d.amount) : null,
        description: d.description,
      })),
    });
  }

  const combinedChartData = Array.from(allMonthlyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      netValue: Math.round(d.netValue * 100) / 100,
      cumulativeDistributions: Math.round(d.cumDist * 100) / 100,
      monthlyDistribution: Math.round(d.monthDist * 100) / 100,
      monthlyContribution: Math.round(d.monthContrib * 100) / 100,
    }));

  const currentValue = totalInvested;
  const totalReturnPct =
    totalInvested > 0
      ? Math.round((totalDistributions / totalInvested) * 10000) / 100
      : 0;

  // Use UTC methods to avoid timezone shifts from DB round-trip
  const lastDay = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 1, 0)).getUTCDate();
  const statementDate = `${periodEnd.getUTCMonth() + 1}/${lastDay}/${periodEnd.getUTCFullYear()}`;

  const ALLOC_COLORS: Record<string, string> = {
    "Oil & Gas": "#B07D3A",
    "Real Estate": "#7A5528",
    "Private Credit": "#1A2640",
    "Specialty Assets": "#2C3E5C",
    "Specialty": "#2C3E5C",
  };
  const allocMap = new Map<string, number>();
  for (const inv of investmentsData) {
    allocMap.set(inv.assetClassName, (allocMap.get(inv.assetClassName) || 0) + inv.amountInvested);
  }
  const allocation = Array.from(allocMap.entries()).map(([name, value]) => ({
    name,
    value,
    color: ALLOC_COLORS[name] || "#718096",
  }));

  const GOLD_SHADES = ["#B07D3A", "#7A5528", "#4A3818", "#E8D5B0", "#D4B483"];
  const NAVY_SHADES = ["#1A2640", "#2C3E5C", "#406984", "#0D1428", "#8599B8"];
  let gi = 0;
  let ni = 0;
  const investmentAllocation = investmentsData.map((inv) => {
    const isGold = inv.assetClassName === "Oil & Gas" || inv.assetClassName === "Real Estate";
    const color = isGold
      ? GOLD_SHADES[gi++ % GOLD_SHADES.length]
      : NAVY_SHADES[ni++ % NAVY_SHADES.length];
    return { name: inv.investmentName, value: inv.amountInvested, color };
  });

  return {
    clientName: user.name || user.email,
    clientEmail: user.email,
    statementDate,
    periodStart,
    periodEnd,
    totalInvested,
    currentValue,
    totalDistributions,
    totalReturnPct,
    weightedIrr: totalWeight > 0 ? Math.round((weightedIrr / totalWeight) * 100) / 100 : 0,
    weightedApr: totalWeight > 0 ? Math.round((weightedApr / totalWeight) * 100) / 100 : 0,
    investments: investmentsData,
    allocation,
    investmentAllocation,
    combinedChartData,
    banners: Array.from(uniqueBanners.values()).map((b) => ({
      title: b.title,
      description: b.description,
      imageUrl: b.imageUrl,
      buttonText: b.buttonText,
      buttonUrl: b.buttonUrl,
      gradientFrom: b.gradientFrom,
      gradientTo: b.gradientTo,
    })),
    disclosures: disclosures.map((d) => ({ title: d.title, body: d.body })),
    org: {
      name: org?.name || "Partners + Capital",
      legalName: org?.legalName || null,
      email: org?.email || null,
      phone: org?.phone || null,
      website: org?.website || null,
      address: org?.address || null,
      logoUrl: org?.logoUrl || null,
    },
  };
}

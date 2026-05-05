import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Total deployed: sum of all non-deleted client investment amounts
    const totalResult = await prisma.clientInvestment.aggregate({
      _sum: { amountInvested: true },
      where: { deletedAt: null },
    });

    const totalRaw = Number(totalResult._sum.amountInvested ?? 0);

    // Format total deployed as "$10M+" style
    let totalDeployed: string;
    if (totalRaw >= 1_000_000_000) {
      totalDeployed = `$${Math.floor(totalRaw / 1_000_000_000)}B+`;
    } else if (totalRaw >= 1_000_000) {
      totalDeployed = `$${Math.floor(totalRaw / 1_000_000)}M+`;
    } else if (totalRaw >= 1_000) {
      totalDeployed = `$${Math.floor(totalRaw / 1_000)}K+`;
    } else {
      totalDeployed = `$${totalRaw}`;
    }

    // Weighted average net return: SUM(irr * amountInvested) / SUM(amountInvested)
    const investments = await prisma.clientInvestment.findMany({
      where: { deletedAt: null, irr: { not: null } },
      select: { irr: true, amountInvested: true },
    });

    let avgNetReturn = "0%";
    if (investments.length > 0) {
      let weightedSum = 0;
      let totalWeight = 0;
      for (const inv of investments) {
        const irr = Number(inv.irr);
        const amount = Number(inv.amountInvested);
        weightedSum += irr * amount;
        totalWeight += amount;
      }
      if (totalWeight > 0) {
        const avg = weightedSum / totalWeight;
        avgNetReturn = `${Math.round(avg * 100)}%`;
      }
    }

    // Asset class count: distinct asset classes from non-deleted investments
    const assetClassResult = await prisma.investment.findMany({
      where: { deletedAt: null },
      select: { assetClassId: true },
      distinct: ["assetClassId"],
    });

    const assetClassCount = assetClassResult.length;

    return NextResponse.json({
      totalDeployed,
      avgNetReturn,
      assetClassCount,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { totalDeployed: "$0", avgNetReturn: "0%", assetClassCount: 0 },
      { status: 200 }
    );
  }
}

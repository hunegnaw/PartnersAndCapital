import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    // Get all client investments for scoping
    const clientInvestmentIds = await prisma.clientInvestment.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    const ciIds = clientInvestmentIds.map((ci) => ci.id);

    const [contributions, distributions] = await Promise.all([
      prisma.contribution.findMany({
        where: {
          userId: user.id,
          clientInvestmentId: { in: ciIds },
          deletedAt: null,
        },
        include: {
          clientInvestment: {
            select: {
              investment: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.distribution.findMany({
        where: {
          userId: user.id,
          clientInvestmentId: { in: ciIds },
          deletedAt: null,
        },
        include: {
          clientInvestment: {
            select: {
              investment: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    const totalContributions = contributions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    );
    const totalDistributions = distributions.reduce(
      (sum, d) => sum + Number(d.amount),
      0
    );
    const netCashFlow = totalContributions - totalDistributions;

    return NextResponse.json({
      contributions,
      distributions,
      summary: {
        totalContributions,
        totalDistributions,
        netCashFlow,
      },
    });
  } catch (error) {
    console.error("Error fetching capital activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

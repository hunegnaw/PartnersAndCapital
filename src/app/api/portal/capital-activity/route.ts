import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/impersonation";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    // Get all client investments for scoping
    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { userId, deletedAt: null, investment: { deletedAt: null } },
      select: { id: true, amountInvested: true },
    });
    const ciIds = clientInvestments.map((ci) => ci.id);

    const [contributions, distributions] = await Promise.all([
      prisma.contribution.findMany({
        where: {
          userId,
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
          userId,
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

    // Use amountInvested from positions (source of truth, not contribution records)
    const totalContributions = clientInvestments.reduce(
      (sum, ci) => sum + Number(ci.amountInvested),
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

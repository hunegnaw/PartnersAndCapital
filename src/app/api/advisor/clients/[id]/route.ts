import { NextResponse } from "next/server";
import { requireAdvisor } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const ASSET_CLASS_COLORS = [
  "#b8860b",
  "#0f1c2e",
  "#4a7c59",
  "#8b5e3c",
  "#6b5b95",
  "#d4a017",
  "#2e86ab",
  "#a23b72",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdvisor();
  if (user instanceof NextResponse) return user;

  const { id: clientId } = await params;

  try {
    // Verify this advisor has active access to this client
    const advisorRecord = await prisma.advisor.findFirst({
      where: {
        advisorUserId: user.id,
        clientId,
        status: "ACTIVE",
      },
      include: {
        client: { select: { name: true, company: true } },
        accesses: {
          where: { revokedAt: null },
          select: {
            permissionLevel: true,
            expiresAt: true,
            investmentId: true,
          },
        },
      },
    });

    if (!advisorRecord) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Filter out expired accesses
    const activeAccesses = advisorRecord.accesses.filter(
      (a) => !a.expiresAt || new Date(a.expiresAt) > now
    );

    if (activeAccesses.length === 0) {
      return NextResponse.json(
        { error: "Access expired" },
        { status: 403 }
      );
    }

    const access = activeAccesses[0];
    const permissionLevel = access.permissionLevel;
    const specificInvestmentId = access.investmentId;

    // Build investment filter
    const investmentWhere: Record<string, unknown> = {
      userId: clientId,
      deletedAt: null,
    };
    if (permissionLevel === "SPECIFIC_INVESTMENT" && specificInvestmentId) {
      investmentWhere.investmentId = specificInvestmentId;
    }

    // Get client positions with investment details
    const positions = await prisma.clientInvestment.findMany({
      where: investmentWhere,
      include: {
        investment: {
          select: {
            id: true,
            name: true,
            status: true,
            assetClass: { select: { name: true } },
          },
        },
      },
    });

    // Calculate KPIs
    const totalInvested = positions.reduce(
      (sum, p) => sum + Number(p.amountInvested),
      0
    );
    const currentValue = positions.reduce(
      (sum, p) => sum + Number(p.currentValue),
      0
    );
    const totalGain = currentValue - totalInvested;
    const totalReturnPct =
      totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // Build allocation by asset class
    const allocationMap = new Map<string, number>();
    for (const pos of positions) {
      const className = pos.investment.assetClass.name;
      const current = allocationMap.get(className) || 0;
      allocationMap.set(className, current + Number(pos.currentValue));
    }

    const allocation = Array.from(allocationMap.entries()).map(
      ([name, value], i) => ({
        name,
        percentage: currentValue > 0 ? (value / currentValue) * 100 : 0,
        color: ASSET_CLASS_COLORS[i % ASSET_CLASS_COLORS.length],
      })
    );

    // Build investments list
    const investments = positions.map((p) => ({
      id: p.id,
      name: p.investment.name,
      amountInvested: Number(p.amountInvested),
      currentValue: Number(p.currentValue),
      status: p.status,
    }));

    // Build response
    const response: Record<string, unknown> = {
      client: {
        name: advisorRecord.client.name,
        company: advisorRecord.client.company,
      },
      permissionLevel,
      totalInvested,
      currentValue,
      totalGain,
      totalReturnPct,
      allocation,
      investments,
    };

    // Add documents if permission allows
    if (
      permissionLevel === "DASHBOARD_AND_TAX_DOCUMENTS" ||
      permissionLevel === "DASHBOARD_AND_DOCUMENTS" ||
      permissionLevel === "SPECIFIC_INVESTMENT"
    ) {
      const docWhere: Record<string, unknown> = {
        userId: clientId,
        deletedAt: null,
      };

      if (permissionLevel === "DASHBOARD_AND_TAX_DOCUMENTS") {
        docWhere.type = { in: ["K1", "TAX_1099"] };
      }

      if (permissionLevel === "SPECIFIC_INVESTMENT" && specificInvestmentId) {
        docWhere.investmentId = specificInvestmentId;
      }

      const documents = await prisma.document.findMany({
        where: docWhere,
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      response.documents = documents.map((d) => ({
        id: d.id,
        title: d.name,
        docType: d.type,
        createdAt: d.createdAt.toISOString(),
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Advisor client view error:", error);
    return NextResponse.json(
      { error: "Failed to load client data" },
      { status: 500 }
    );
  }
}

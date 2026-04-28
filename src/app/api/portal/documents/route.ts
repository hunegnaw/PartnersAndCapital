import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getEffectiveUserId } from "@/lib/impersonation";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const year = searchParams.get("year") || "";
    const investmentFilter = searchParams.get("investment") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
    );

    // Get user's investment IDs for scoping
    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { userId, deletedAt: null },
      select: {
        investmentId: true,
        investment: { select: { id: true, name: true } },
      },
    });
    const investmentIds = clientInvestments.map((ci) => ci.investmentId);

    // Base ownership filter: documents assigned to user OR to user's investments
    const ownershipFilter: Prisma.DocumentWhereInput = {
      OR: [
        { userId },
        { investmentId: { in: investmentIds } },
      ],
    };

    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      ...ownershipFilter,
      ...(search ? { name: { contains: search } } : {}),
      ...(type && type !== "all" ? { type: type as Prisma.EnumDocumentTypeFilter["equals"] } : {}),
      ...(year && year !== "all" ? { year: parseInt(year) } : {}),
      ...(investmentFilter && investmentFilter !== "all"
        ? { investment: { name: investmentFilter } }
        : {}),
    };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          name: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          type: true,
          year: true,
          description: true,
          advisorVisible: true,
          createdAt: true,
          investment: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ]);

    // Category counts for sidebar
    const allDocsWhere: Prisma.DocumentWhereInput = {
      deletedAt: null,
      ...ownershipFilter,
    };

    const allDocs = await prisma.document.groupBy({
      by: ["type"],
      where: allDocsWhere,
      _count: { type: true },
    });

    const categoryCounts: Record<string, number> = {};
    for (const group of allDocs) {
      categoryCounts[group.type] = group._count.type;
    }

    // Investment document counts for "By Investment" sidebar
    const investmentDocs = await prisma.document.groupBy({
      by: ["investmentId"],
      where: {
        deletedAt: null,
        investmentId: { in: investmentIds },
      },
      _count: { investmentId: true },
    });

    const investmentCounts: { name: string; count: number }[] = [];
    for (const group of investmentDocs) {
      if (group.investmentId) {
        const ci = clientInvestments.find(
          (c) => c.investmentId === group.investmentId
        );
        if (ci) {
          investmentCounts.push({
            name: ci.investment.name,
            count: group._count.investmentId,
          });
        }
      }
    }

    // Get advisor info for CPA banner
    const advisorWithAccess = await prisma.advisor.findFirst({
      where: {
        clientId: userId,
        status: "ACTIVE",
        accesses: {
          some: {
            permissionLevel: {
              in: [
                "DASHBOARD_AND_TAX_DOCUMENTS",
                "DASHBOARD_AND_DOCUMENTS",
              ],
            },
            revokedAt: null,
          },
        },
      },
      select: {
        name: true,
        advisorType: true,
        accesses: {
          where: { revokedAt: null },
          select: {
            permissionLevel: true,
            expiresAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      documents,
      total,
      page,
      pageSize,
      categoryCounts,
      investmentCounts,
      advisorAccess: advisorWithAccess
        ? {
            name: advisorWithAccess.name,
            type: advisorWithAccess.advisorType,
            permissionLevel: advisorWithAccess.accesses[0]?.permissionLevel,
            expiresAt: advisorWithAccess.accesses[0]?.expiresAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

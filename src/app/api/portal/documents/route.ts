import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const year = searchParams.get("year") || "";
    const investmentId = searchParams.get("investmentId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
    );

    // Get user's investment IDs for scoping
    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { investmentId: true },
    });
    const investmentIds = clientInvestments.map((ci) => ci.investmentId);

    // Base ownership filter: documents assigned to user OR to user's investments
    const ownershipFilter: Prisma.DocumentWhereInput = {
      OR: [
        { userId: user.id },
        { investmentId: { in: investmentIds } },
      ],
    };

    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      ...ownershipFilter,
      ...(search ? { name: { contains: search } } : {}),
      ...(type ? { type: type as Prisma.EnumDocumentTypeFilter["equals"] } : {}),
      ...(year ? { year: parseInt(year) } : {}),
      ...(investmentId ? { investmentId } : {}),
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

    return NextResponse.json({
      documents,
      total,
      page,
      pageSize,
      categoryCounts,
    });
  } catch (error) {
    console.error("Error listing documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

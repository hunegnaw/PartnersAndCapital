import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const clientId = searchParams.get("clientId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
    const sortBy = searchParams.get("sortBy") || "period";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    let orderBy: Prisma.StatementOrderByWithRelationInput | Prisma.StatementOrderByWithRelationInput[];
    switch (sortBy) {
      case "client":
        orderBy = [{ user: { name: sortDir } }, { user: { email: sortDir } }];
        break;
      case "totalInvested":
        orderBy = { totalInvested: sortDir };
        break;
      case "status":
        orderBy = { status: sortDir };
        break;
      case "generated":
        orderBy = { generatedAt: sortDir };
        break;
      case "approver":
        orderBy = { approver: { name: sortDir } };
        break;
      case "period":
      default:
        orderBy = [{ periodStart: sortDir }, { createdAt: "desc" }];
        break;
    }

    const where: Record<string, unknown> = { deletedAt: null };

    if (status) where.status = status;
    if (clientId) where.userId = clientId;
    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      where.periodStart = new Date(y, m - 1, 1);
    } else if (year) {
      const y = parseInt(year, 10);
      where.periodStart = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
    }

    const [statements, total] = await Promise.all([
      prisma.statement.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.statement.count({ where }),
    ]);

    const counts = await prisma.statement.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const c of counts) {
      statusCounts[c.status] = c._count._all;
    }

    return NextResponse.json({
      statements: statements.map((s) => ({
        ...s,
        totalInvested: Number(s.totalInvested),
        currentValue: Number(s.currentValue),
        totalDistributions: Number(s.totalDistributions),
      })),
      total,
      page,
      pageSize,
      statusCounts,
    });
  } catch (error) {
    console.error("Error fetching statements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

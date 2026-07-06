import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { statementYearOptions } from "@/lib/utils";
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
    const search = searchParams.get("search")?.trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
    const sortBy = searchParams.get("sortBy") || "generated";
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

    // Free-text search across client name/email and approver name.
    // MySQL's default collation is case-insensitive, so `contains` matches
    // regardless of case without a Postgres-only `mode: "insensitive"`.
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { approver: { name: { contains: search } } },
      ];
    }

    // Period filter. periodStart is stored as UTC midnight on the 1st of the
    // month, so match with UTC-constructed dates. A month with no year matches
    // that month across every selectable year via an exact `in` list.
    if (month) {
      const m = parseInt(month, 10);
      const years = year ? [parseInt(year, 10)] : statementYearOptions();
      where.periodStart = { in: years.map((y) => new Date(Date.UTC(y, m - 1, 1))) };
    } else if (year) {
      const y = parseInt(year, 10);
      where.periodStart = { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
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

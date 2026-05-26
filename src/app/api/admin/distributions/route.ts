import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const investmentId = searchParams.get("investmentId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.DistributionWhereInput = {
      deletedAt: null,
      ...(type ? { type: type as Prisma.EnumDistributionTypeFilter["equals"] } : {}),
      ...(investmentId
        ? { clientInvestment: { investmentId } }
        : {}),
      ...(search
        ? {
            OR: [
              { user: { name: { contains: search } } },
              { clientInvestment: { investment: { name: { contains: search } } } },
            ],
          }
        : {}),
    };

    const [distributions, total, investments] = await Promise.all([
      prisma.distribution.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          clientInvestment: {
            select: {
              id: true,
              investmentId: true,
              investment: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.distribution.count({ where }),
      prisma.investment.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ distributions, total, page, pageSize, investments });
  } catch (error) {
    console.error("Error listing distributions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

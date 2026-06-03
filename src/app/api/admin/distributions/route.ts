import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";
    const investmentId = searchParams.get("investmentId") || "";
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const sortBy = searchParams.get("sortBy") || "date";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.DistributionWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
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
        orderBy: sortBy === "client" ? { user: { name: sortDir } }
          : sortBy === "investment" ? { clientInvestment: { investment: { name: sortDir } } }
          : sortBy === "amount" ? { amount: sortDir }
          : sortBy === "type" ? { type: sortDir }
          : sortBy === "status" ? { status: sortDir }
          : { date: sortDir },
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

export async function DELETE(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const distributions = await prisma.distribution.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, amount: true, clientInvestmentId: true },
    });

    if (distributions.length === 0) {
      return NextResponse.json(
        { error: "No distributions found" },
        { status: 404 }
      );
    }

    const decrementsByPosition = new Map<string, number>();
    for (const d of distributions) {
      const current = decrementsByPosition.get(d.clientInvestmentId) || 0;
      decrementsByPosition.set(d.clientInvestmentId, current + Number(d.amount));
    }

    await prisma.$transaction(async (tx) => {
      await tx.distribution.updateMany({
        where: { id: { in: distributions.map((d) => d.id) } },
        data: { deletedAt: new Date() },
      });

      for (const [ciId, totalAmount] of decrementsByPosition) {
        await tx.clientInvestment.update({
          where: { id: ciId },
          data: { cashDistributed: { decrement: totalAmount } },
        });
      }
    });

    await createAuditLog({
      userId: user.id,
      action: "BULK_DELETE_DISTRIBUTIONS",
      targetType: "Distribution",
      targetId: distributions.map((d) => d.id).join(","),
      details: { count: distributions.length, ids: distributions.map((d) => d.id) },
      request,
    });

    return NextResponse.json({ deleted: distributions.length });
  } catch (error) {
    console.error("Error deleting distributions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

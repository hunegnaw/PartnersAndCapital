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
    const status = searchParams.get("status") || "";
    const assetClassId = searchParams.get("assetClassId") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.InvestmentWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(status ? { status: status as Prisma.EnumInvestmentStatusFilter["equals"] } : {}),
      ...(assetClassId ? { assetClassId } : {}),
    };

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        include: {
          assetClass: true,
          _count: {
            select: { clientInvestments: { where: { deletedAt: null } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.investment.count({ where }),
    ]);

    return NextResponse.json({ investments, total, page, pageSize });
  } catch (error) {
    console.error("Error listing investments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const {
      name,
      description,
      assetClassId,
      status,
      targetReturn,
      minimumInvestment,
      vintage,
      startDate,
      endDate,
      location,
      targetHoldPeriod,
      distributionCadence,
      fundStatus,
    } = body;

    if (!name || !assetClassId) {
      return NextResponse.json(
        { error: "Name and asset class are required" },
        { status: 400 }
      );
    }

    // Verify asset class exists
    const assetClass = await prisma.assetClass.findFirst({
      where: { id: assetClassId, deletedAt: null },
    });
    if (!assetClass) {
      return NextResponse.json(
        { error: "Asset class not found" },
        { status: 404 }
      );
    }

    const investment = await prisma.investment.create({
      data: {
        name,
        description: description || null,
        assetClassId,
        status: status || "ACTIVE",
        targetReturn: targetReturn ?? null,
        minimumInvestment: minimumInvestment ?? null,
        vintage: vintage ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        location: location || null,
        targetHoldPeriod: targetHoldPeriod || null,
        distributionCadence: distributionCadence || null,
        fundStatus: fundStatus || null,
      },
      include: { assetClass: true },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_INVESTMENT",
      targetType: "Investment",
      targetId: investment.id,
      details: { name, assetClassId },
      request,
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    console.error("Error creating investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

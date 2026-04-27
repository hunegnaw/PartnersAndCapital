import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
      include: {
        assetClass: true,
        clientInvestments: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                company: true,
              },
            },
          },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        dealRoomUpdates: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(investment);
  } catch (error) {
    console.error("Error fetching investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

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

    const updated = await prisma.investment.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(assetClassId !== undefined && { assetClassId }),
        ...(status !== undefined && { status }),
        ...(targetReturn !== undefined && { targetReturn }),
        ...(minimumInvestment !== undefined && { minimumInvestment }),
        ...(vintage !== undefined && { vintage }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(location !== undefined && { location }),
        ...(targetHoldPeriod !== undefined && { targetHoldPeriod }),
        ...(distributionCadence !== undefined && { distributionCadence }),
        ...(fundStatus !== undefined && { fundStatus }),
      },
      include: { assetClass: true },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_INVESTMENT",
      targetType: "Investment",
      targetId: id,
      details: body,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const existing = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    await prisma.investment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_INVESTMENT",
      targetType: "Investment",
      targetId: id,
      details: { name: existing.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

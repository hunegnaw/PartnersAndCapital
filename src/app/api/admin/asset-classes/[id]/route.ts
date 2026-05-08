import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.assetClass.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Asset class not found" },
        { status: 404 }
      );
    }

    const { name, description, icon, sortOrder } = body;

    const updated = await prisma.assetClass.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description || null }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_ASSET_CLASS",
      targetType: "AssetClass",
      targetId: id,
      details: body,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating asset class:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "An asset class with that name already exists" },
        { status: 409 }
      );
    }
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

    const existing = await prisma.assetClass.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { investments: { where: { deletedAt: null } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Asset class not found" },
        { status: 404 }
      );
    }

    if (existing._count.investments > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${existing._count.investments} investment(s) use this asset class. Reassign them first.`,
        },
        { status: 409 }
      );
    }

    await prisma.assetClass.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_ASSET_CLASS",
      targetType: "AssetClass",
      targetId: id,
      details: { name: existing.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting asset class:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { title, content, isBroadcast, showAsBanner, targetUserId } = body;

    const existing = await prisma.activityFeed.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (targetUserId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
      });
      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found" },
          { status: 404 }
        );
      }
    }

    const entry = await prisma.activityFeed.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(isBroadcast !== undefined && { isBroadcast }),
        ...(showAsBanner !== undefined && { showAsBanner }),
        ...(targetUserId !== undefined && {
          targetUserId: targetUserId || null,
        }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_ACTIVITY_POST",
      targetType: "ActivityFeed",
      targetId: id,
      details: { title, isBroadcast, showAsBanner },
      request,
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating activity post:", error);
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

    const existing = await prisma.activityFeed.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.activityFeed.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_ACTIVITY_POST",
      targetType: "ActivityFeed",
      targetId: id,
      details: { title: existing.title },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

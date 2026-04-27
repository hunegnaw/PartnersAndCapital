import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where = { deletedAt: null };

    const [entries, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityFeed.count({ where }),
    ]);

    return NextResponse.json({ entries, total, page, pageSize });
  } catch (error) {
    console.error("Error listing activity feed:", error);
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
    const { title, content, isBroadcast, targetUserId } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // If targeting a specific user, verify they exist
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

    const entry = await prisma.activityFeed.create({
      data: {
        authorId: user.id,
        title,
        content,
        isBroadcast: isBroadcast ?? false,
        targetUserId: targetUserId || null,
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
      action: "CREATE_ACTIVITY_POST",
      targetType: "ActivityFeed",
      targetId: entry.id,
      details: { title, isBroadcast, targetUserId },
      request,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating activity post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

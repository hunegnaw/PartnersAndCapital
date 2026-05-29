import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEffectiveUserId } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    // Count threads visible to this user that have messages newer than their read receipt
    const threads = await prisma.messageThread.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isBroadcast: true, broadcastParentId: null },
          { participantId: userId },
        ],
      },
      select: {
        id: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        readReceipts: {
          where: { userId },
          select: { readAt: true },
        },
      },
    });

    const count = threads.filter((t) => {
      if (t._count.messages === 0) return false;
      if (t.readReceipts.length === 0) return true;
      return t.readReceipts[0].readAt < t.updatedAt;
    }).length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

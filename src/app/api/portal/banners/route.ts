import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const thread = await prisma.messageThread.findFirst({
      where: {
        deletedAt: null,
        showAsBanner: true,
        isBroadcast: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { body: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!thread) {
      return NextResponse.json({ banner: null });
    }

    const content = thread.bannerContent || thread.messages[0]?.body || thread.subject;

    return NextResponse.json({
      banner: {
        id: thread.id,
        title: thread.subject,
        content,
      },
    });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

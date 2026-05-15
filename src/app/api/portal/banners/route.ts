import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const banners = await prisma.activityFeed.findMany({
      where: {
        deletedAt: null,
        showAsBanner: true,
        OR: [
          { isBroadcast: true },
          { targetUserId: user.id },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    return NextResponse.json({ banner: banners[0] || null });
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

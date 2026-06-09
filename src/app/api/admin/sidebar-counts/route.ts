import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const [
      clientCount,
      investmentCount,
      distributionCount,
      assetClassCount,
      documentCount,
      advisorCount,
      ticketCount,
      accessRequestCount,
      verificationCount,
      pageCount,
      blogPostCount,
      blogCategoryCount,
      mediaCount,
      statementCount,
      unreadThreads,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CLIENT", deletedAt: null } }),
      prisma.investment.count({ where: { deletedAt: null } }),
      prisma.distribution.count({ where: { deletedAt: null } }),
      prisma.assetClass.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.advisor.count(),
      prisma.supportTicket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.accessRequest.count({ where: { status: "PENDING" } }),
      prisma.verification.count({ where: { status: "SUBMITTED" } }),
      prisma.page.count({ where: { deletedAt: null } }),
      prisma.blogPost.count({ where: { deletedAt: null } }),
      prisma.blogCategory.count({ where: { deletedAt: null } }),
      prisma.media.count({ where: { deletedAt: null } }),
      prisma.statement.count({ where: { status: "GENERATED", deletedAt: null } }),
      // Count unread message threads for this admin
      prisma.messageThread.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          updatedAt: true,
          _count: { select: { messages: true } },
          readReceipts: {
            where: { userId: user.id },
            select: { readAt: true },
          },
        },
      }),
    ]);

    const messageCount = unreadThreads.filter((t) => {
      if (t._count.messages === 0) return false;
      if (t.readReceipts.length === 0) return true;
      return t.readReceipts[0].readAt < t.updatedAt;
    }).length;

    return NextResponse.json({
      clientCount,
      investmentCount,
      distributionCount,
      assetClassCount,
      documentCount,
      advisorCount,
      ticketCount,
      accessRequestCount,
      verificationCount,
      pageCount,
      blogPostCount,
      blogCategoryCount,
      mediaCount,
      messageCount,
      statementCount,
    });
  } catch (error) {
    console.error("Error fetching sidebar counts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

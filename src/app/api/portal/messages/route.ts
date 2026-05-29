import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEffectiveUserId, requireNotImpersonating } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { secureMessageEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where = {
      deletedAt: null,
      OR: [
        { isBroadcast: true, broadcastParentId: null },
        { participantId: userId },
      ],
    };

    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true, senderId: true },
          },
          _count: { select: { messages: true } },
          readReceipts: {
            where: { userId },
            select: { readAt: true },
          },
          // Include the client's private reply thread for broadcasts
          broadcastReplies: {
            where: { participantId: userId, deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.messageThread.count({ where }),
    ]);

    const threadList = threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      isBroadcast: t.isBroadcast,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdBy,
      messageCount: t._count.messages,
      lastMessage: t.messages[0] || null,
      unread: t.readReceipts.length === 0
        ? t._count.messages > 0
        : t.readReceipts[0].readAt < t.updatedAt,
      privateReplyThreadId: t.broadcastReplies?.[0]?.id || null,
    }));

    return NextResponse.json({ threads: threadList, total, page, pageSize });
  } catch (error) {
    console.error("Error listing portal messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const { userId } = await getEffectiveUserId();

    const { subject, body: messageBody } = await request.json();

    if (!subject || !messageBody) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const thread = await prisma.messageThread.create({
      data: {
        subject,
        isBroadcast: false,
        createdById: userId,
        participantId: userId,
        messages: {
          create: {
            senderId: userId,
            body: messageBody,
          },
        },
      },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    const adminIds = admins.map((a) => a.id);
    if (adminIds.length > 0) {
      await createBulkNotifications(adminIds, {
        type: "SECURE_MESSAGE",
        title: "New client message",
        message: "A client has sent a new secure message.",
        link: "/admin/activity",
      });
    }

    // Send email to admins (fire-and-forget)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = await getEmailLogoUrl();
    for (const admin of admins) {
      sendEmail({
        to: admin.email,
        subject: "New Secure Message - Partners + Capital",
        html: secureMessageEmail({
          userName: admin.name || "Admin",
          loginUrl: `${baseUrl}/admin/activity`,
          logoUrl,
        }),
      }).catch(() => {});
    }

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error creating portal message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

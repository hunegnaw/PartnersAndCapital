import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification, createBulkNotifications } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { secureMessageEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all"; // all | broadcast | targeted

    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.subject = { contains: search };
    }

    if (filter === "broadcast") {
      where.isBroadcast = true;
    } else if (filter === "targeted") {
      where.isBroadcast = false;
    }

    const [threads, total] = await Promise.all([
      prisma.messageThread.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          participant: { select: { id: true, name: true, email: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true, senderId: true },
          },
          _count: { select: { messages: true } },
          readReceipts: {
            where: { userId: user.id },
            select: { readAt: true },
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
      showAsBanner: t.showAsBanner,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdBy,
      participant: t.participant,
      messageCount: t._count.messages,
      lastMessage: t.messages[0] || null,
      unread: t.readReceipts.length === 0
        ? t._count.messages > 0
        : t.readReceipts[0].readAt < t.updatedAt,
    }));

    return NextResponse.json({ threads: threadList, total, page, pageSize });
  } catch (error) {
    console.error("Error listing message threads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { subject, body: messageBody, isBroadcast, showAsBanner, bannerContent, participantId } = body;

    if (!subject || !messageBody) {
      return NextResponse.json({ error: "Subject and message body are required" }, { status: 400 });
    }

    if (!isBroadcast && !participantId) {
      return NextResponse.json({ error: "A recipient is required for targeted messages" }, { status: 400 });
    }

    // Verify participant exists if targeted
    if (participantId) {
      const target = await prisma.user.findFirst({
        where: { id: participantId, deletedAt: null },
      });
      if (!target) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
      }
    }

    const thread = await prisma.messageThread.create({
      data: {
        subject,
        isBroadcast: isBroadcast ?? false,
        showAsBanner: (isBroadcast && showAsBanner) ?? false,
        bannerContent: (isBroadcast && showAsBanner && bannerContent) ? bannerContent : null,
        createdById: user.id,
        participantId: isBroadcast ? null : participantId,
        messages: {
          create: {
            senderId: user.id,
            body: messageBody,
          },
        },
      },
      include: {
        participant: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_SECURE_MESSAGE",
      targetType: "MessageThread",
      targetId: thread.id,
      details: { subject, isBroadcast, participantId },
      request,
    });

    // Send notifications + emails
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = await getEmailLogoUrl();

    if (isBroadcast) {
      // Notify all active clients
      const clients = await prisma.user.findMany({
        where: { role: "CLIENT", deletedAt: null, accountStatus: "ACTIVE" },
        select: { id: true, name: true, email: true },
      });

      const clientIds = clients.map((c) => c.id);
      if (clientIds.length > 0) {
        await createBulkNotifications(clientIds, {
          type: "SECURE_MESSAGE",
          title: "New secure message",
          message: "You have a new secure message. Log in to read it.",
          link: "/messages",
        });
      }

      // Send emails (fire-and-forget)
      for (const client of clients) {
        sendEmail({
          to: client.email,
          subject: "New Secure Message - Partners + Capital",
          html: secureMessageEmail({
            userName: client.name || "Investor",
            loginUrl: `${baseUrl}/messages`,
            logoUrl,
          }),
        }).catch(() => {});
      }
    } else if (thread.participant) {
      // Notify specific client
      await createNotification({
        userId: thread.participant.id,
        type: "SECURE_MESSAGE",
        title: "New secure message",
        message: "You have a new secure message. Log in to read it.",
        link: "/messages",
      });

      sendEmail({
        to: thread.participant.email,
        subject: "New Secure Message - Partners + Capital",
        html: secureMessageEmail({
          userName: thread.participant.name || "Investor",
          loginUrl: `${baseUrl}/messages`,
          logoUrl,
        }),
      }).catch(() => {});
    }

    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    console.error("Error creating message thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

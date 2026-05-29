import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { secureMessageEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const thread = await prisma.messageThread.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        participant: { select: { id: true, name: true, email: true } },
        broadcastParent: { select: { id: true, subject: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Upsert read receipt
    await prisma.messageReadReceipt.upsert({
      where: { threadId_userId: { threadId: id, userId: user.id } },
      create: { threadId: id, userId: user.id },
      update: { readAt: new Date() },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const { body: messageBody } = await request.json();

    if (!messageBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const thread = await prisma.messageThread.findFirst({
      where: { id, deletedAt: null },
      include: {
        participant: { select: { id: true, name: true, email: true } },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Create the message and update thread timestamp
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { threadId: id, senderId: user.id, body: messageBody },
        include: { sender: { select: { id: true, name: true, role: true } } },
      }),
      prisma.messageThread.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
      // Update admin's own read receipt
      prisma.messageReadReceipt.upsert({
        where: { threadId_userId: { threadId: id, userId: user.id } },
        create: { threadId: id, userId: user.id },
        update: { readAt: new Date() },
      }),
    ]);

    await createAuditLog({
      userId: user.id,
      action: "REPLY_SECURE_MESSAGE",
      targetType: "MessageThread",
      targetId: id,
      request,
    });

    // Notify participant if targeted thread
    if (thread.participantId && thread.participant) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const logoUrl = await getEmailLogoUrl();

      await createNotification({
        userId: thread.participantId,
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

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error replying to thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const { showAsBanner, bannerContent } = body;

    const thread = await prisma.messageThread.findFirst({
      where: { id, deletedAt: null },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const updated = await prisma.messageThread.update({
      where: { id },
      data: {
        showAsBanner: showAsBanner ?? thread.showAsBanner,
        bannerContent: bannerContent !== undefined ? bannerContent : thread.bannerContent,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_SECURE_MESSAGE",
      targetType: "MessageThread",
      targetId: id,
      details: { showAsBanner, bannerContent },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const thread = await prisma.messageThread.findFirst({
      where: { id, deletedAt: null },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    await prisma.messageThread.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_SECURE_MESSAGE",
      targetType: "MessageThread",
      targetId: id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

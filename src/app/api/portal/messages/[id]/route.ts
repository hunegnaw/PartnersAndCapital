import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEffectiveUserId, requireNotImpersonating } from "@/lib/impersonation";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { secureMessageEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();
    const { id } = await params;

    const thread = await prisma.messageThread.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { isBroadcast: true },
          { participantId: userId },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        participant: { select: { id: true, name: true } },
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
      where: { threadId_userId: { threadId: id, userId } },
      create: { threadId: id, userId },
      update: { readAt: new Date() },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error fetching portal thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const { userId } = await getEffectiveUserId();
    const { id } = await params;
    const { body: messageBody } = await request.json();

    if (!messageBody) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const thread = await prisma.messageThread.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { isBroadcast: true },
          { participantId: userId },
        ],
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    let resultThread;

    if (thread.isBroadcast) {
      // For broadcast threads, spawn a new private thread
      // Check if one already exists
      let privateThread = await prisma.messageThread.findFirst({
        where: {
          broadcastParentId: thread.id,
          participantId: userId,
          deletedAt: null,
        },
      });

      if (privateThread) {
        // Add reply to existing private thread
        await prisma.$transaction([
          prisma.message.create({
            data: { threadId: privateThread.id, senderId: userId, body: messageBody },
          }),
          prisma.messageThread.update({
            where: { id: privateThread.id },
            data: { updatedAt: new Date() },
          }),
          prisma.messageReadReceipt.upsert({
            where: { threadId_userId: { threadId: privateThread.id, userId } },
            create: { threadId: privateThread.id, userId },
            update: { readAt: new Date() },
          }),
        ]);
        resultThread = privateThread;
      } else {
        // Create new private thread linked to broadcast
        privateThread = await prisma.messageThread.create({
          data: {
            subject: `Re: ${thread.subject}`,
            isBroadcast: false,
            createdById: userId,
            participantId: userId,
            broadcastParentId: thread.id,
            messages: {
              create: {
                senderId: userId,
                body: messageBody,
              },
            },
          },
        });
        resultThread = privateThread;
      }
    } else {
      // Regular thread - add message
      await prisma.$transaction([
        prisma.message.create({
          data: { threadId: id, senderId: userId, body: messageBody },
        }),
        prisma.messageThread.update({
          where: { id },
          data: { updatedAt: new Date() },
        }),
        prisma.messageReadReceipt.upsert({
          where: { threadId_userId: { threadId: id, userId } },
          create: { threadId: id, userId },
          update: { readAt: new Date() },
        }),
      ]);
      resultThread = thread;
    }

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    const adminIds = admins.map((a) => a.id);
    if (adminIds.length > 0) {
      await createBulkNotifications(adminIds, {
        type: "SECURE_MESSAGE",
        title: "New client reply",
        message: "A client has replied to a secure message.",
        link: "/admin/activity",
      });
    }

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

    return NextResponse.json(resultThread, { status: 201 });
  } catch (error) {
    console.error("Error replying to portal thread:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

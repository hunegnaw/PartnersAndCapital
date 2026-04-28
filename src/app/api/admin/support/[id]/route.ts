import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { ticketReplyEmail } from "@/lib/email-templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const { status, priority } = body;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
    });

    // Notify ticket owner about status change
    if (status) {
      await createNotification({
        userId: ticket.userId,
        type: "SUPPORT_TICKET",
        title: "Ticket updated",
        message: `Ticket updated: ${ticket.subject}`,
        link: "/support",
      });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get ticket for notification
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: user.id,
        message,
      },
    });

    // Notify ticket owner + send email
    if (ticket && ticket.user) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await createNotification({
        userId: ticket.userId,
        type: "SUPPORT_TICKET",
        title: "New reply on your ticket",
        message: `New reply on: ${ticket.subject}`,
        link: "/support",
      });
      await sendEmail({
        to: ticket.user.email,
        subject: `New reply on: ${ticket.subject}`,
        html: ticketReplyEmail({
          userName: ticket.user.name || "Investor",
          ticketSubject: ticket.subject,
          replyPreview: message.slice(0, 200),
          ticketUrl: `${baseUrl}/support`,
        }),
      });
    }

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    console.error("Error adding reply:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

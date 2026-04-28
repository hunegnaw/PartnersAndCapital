import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { ticketReplyEmail } from "@/lib/email-templates";
import { getEffectiveUserId, requireNotImpersonating } from "@/lib/impersonation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();
    const { id } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId },
      include: {
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
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

    // Verify ticket belongs to user
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: user.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: user.id,
        message,
      },
    });

    // Notify all admins about client reply
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, deletedAt: null },
      select: { id: true, email: true, name: true },
    });
    if (admins.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      await createBulkNotifications(
        admins.map((a) => a.id),
        {
          type: "SUPPORT_TICKET",
          title: "Client replied to ticket",
          message: `Client replied to: ${ticket.subject}`,
          link: "/admin/support",
        }
      );
      // Email each admin
      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: `Client replied to: ${ticket.subject}`,
          html: ticketReplyEmail({
            userName: admin.name || "Admin",
            ticketSubject: ticket.subject,
            replyPreview: message.slice(0, 200),
            ticketUrl: `${baseUrl}/admin/support`,
          }),
        });
      }
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

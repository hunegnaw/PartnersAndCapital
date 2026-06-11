import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/notifications";
import { sendEmail, getOrgEmail } from "@/lib/email";
import { ticketSubmittedEmail, ticketAdminNotifyEmail, getEmailLogoUrl } from "@/lib/email-templates";
import { getEffectiveUserId, requireNotImpersonating } from "@/lib/impersonation";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error listing tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { subject, message, category } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        message,
        category: category || null,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = await getEmailLogoUrl();

    // Get the submitting user's info for emails
    const submitter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });

    // Send confirmation email to the client
    if (submitter) {
      sendEmail({
        to: submitter.email,
        subject: `Support Ticket Received - ${subject}`,
        html: ticketSubmittedEmail({
          userName: submitter.name || "Investor",
          ticketSubject: subject,
          ticketUrl: `${baseUrl}/support`,
          logoUrl,
        }),
      }).catch(() => {});
    }

    // Notify all admins about new ticket
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, deletedAt: null },
      select: { id: true, name: true, email: true },
    });
    if (admins.length > 0) {
      await createBulkNotifications(
        admins.map((a) => a.id),
        {
          type: "SUPPORT_TICKET",
          title: "New support ticket",
          message: `New support ticket: ${subject}`,
          link: "/admin/support",
        }
      );
    }

    // Email admin about new ticket
    getOrgEmail().then((orgEmail) => {
      sendEmail({
        to: orgEmail,
        subject: `New Support Ticket - ${subject}`,
        html: ticketAdminNotifyEmail({
          adminName: "Admin",
          clientName: submitter?.name || "A client",
          ticketSubject: subject,
          ticketUrl: `${baseUrl}/admin/support`,
          logoUrl,
        }),
      }).catch(() => {});
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

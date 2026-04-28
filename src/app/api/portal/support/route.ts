import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
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

    // Notify all admins about new ticket
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, deletedAt: null },
      select: { id: true },
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

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

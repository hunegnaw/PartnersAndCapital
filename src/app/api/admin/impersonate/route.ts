import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const COOKIE_NAME = "impersonating";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // Verify the client exists and is a CLIENT role
    const client = await prisma.user.findFirst({
      where: { id: clientId, role: "CLIENT", deletedAt: null },
      select: { id: true, name: true, email: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Set impersonation cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    await createAuditLog({
      userId: admin.id,
      action: "IMPERSONATE_START",
      targetType: "User",
      targetId: clientId,
      details: { clientName: client.name, clientEmail: client.email },
      request,
    });

    return NextResponse.json({
      success: true,
      client: { id: client.id, name: client.name },
    });
  } catch (error) {
    console.error("Error starting impersonation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const cookieStore = await cookies();
    const clientId = cookieStore.get(COOKIE_NAME)?.value;

    // Clear the cookie
    cookieStore.delete(COOKIE_NAME);

    if (clientId) {
      await createAuditLog({
        userId: admin.id,
        action: "IMPERSONATE_END",
        targetType: "User",
        targetId: clientId,
        request,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending impersonation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

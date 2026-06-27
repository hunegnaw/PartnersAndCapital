import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();

    const data: {
      name?: string;
      email?: string;
      phone?: string | null;
      smsConsent?: boolean;
      status?: string;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      data.name = name;
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }
      data.email = email;
    }
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body.smsConsent !== undefined) data.smsConsent = Boolean(body.smsConsent);
    if (body.status !== undefined) {
      if (!["PENDING", "REVIEWED"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.accessRequest.update({ where: { id }, data });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_ACCESS_REQUEST",
      targetType: "AccessRequest",
      targetId: id,
      details: data,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating access request:", error);
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

    await prisma.accessRequest.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_ACCESS_REQUEST",
      targetType: "AccessRequest",
      targetId: id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting access request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

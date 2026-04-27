import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { name, email, role, adminSubRole } = body;

    const existing = await prisma.user.findFirst({
      where: {
        id,
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    // Check email uniqueness if changing email
    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }
    }

    // Validate role if changing
    if (role && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Role must be ADMIN or SUPER_ADMIN" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(adminSubRole !== undefined && { adminSubRole }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        adminSubRole: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_ADMIN_USER",
      targetType: "User",
      targetId: id,
      details: { name, email, role, adminSubRole },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating admin user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        id,
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Admin user not found" },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_ADMIN_USER",
      targetType: "User",
      targetId: id,
      details: { email: existing.email, name: existing.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireNotImpersonating } from "@/lib/impersonation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify ownership
    const advisor = await prisma.advisor.findFirst({
      where: { id, clientId: user.id },
      include: { accesses: true },
    });

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, firm, advisorType, permissionLevel, investmentId, expiresAt } =
      body;

    // Update advisor profile fields
    await prisma.advisor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(firm !== undefined && { firm }),
        ...(advisorType !== undefined && { advisorType }),
      },
    });

    // Update access if permission fields provided
    if (
      permissionLevel !== undefined ||
      investmentId !== undefined ||
      expiresAt !== undefined
    ) {
      const existingAccess = advisor.accesses[0];
      if (existingAccess) {
        await prisma.advisorAccess.update({
          where: { id: existingAccess.id },
          data: {
            ...(permissionLevel !== undefined && { permissionLevel }),
            ...(investmentId !== undefined && {
              investmentId: investmentId || null,
            }),
            ...(expiresAt !== undefined && {
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            }),
          },
        });
      }
    }

    // Fetch updated advisor with accesses
    const result = await prisma.advisor.findUnique({
      where: { id },
      include: {
        accesses: true,
        advisorUser: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_ADVISOR",
      targetType: "Advisor",
      targetId: id,
      details: { name, firm, advisorType, permissionLevel, investmentId, expiresAt },
      request,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating advisor:", error);
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
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify ownership
    const advisor = await prisma.advisor.findFirst({
      where: { id, clientId: user.id },
    });

    if (!advisor) {
      return NextResponse.json(
        { error: "Advisor not found" },
        { status: 404 }
      );
    }

    // Revoke the advisor
    await prisma.advisor.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    // Also revoke all active accesses
    await prisma.advisorAccess.updateMany({
      where: { advisorId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "REVOKE_ADVISOR",
      targetType: "Advisor",
      targetId: id,
      details: { email: advisor.email, name: advisor.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking advisor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

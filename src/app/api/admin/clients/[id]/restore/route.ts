import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// Unarchive (restore) a soft-deleted client — clears deletedAt so they return to
// active views. Mirrors the archive action (DELETE), which is SUPER_ADMIN-only.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const existing = await prisma.user.findFirst({
      where: { id, role: "CLIENT", deletedAt: { not: null } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Archived client not found" },
        { status: 404 }
      );
    }

    // Guard against the unique email constraint: if an active user now holds
    // this client's email (e.g. re-registered after archiving), restoring would
    // collide. Surface a clear error instead of a 500.
    const emailTaken = await prisma.user.findFirst({
      where: { email: existing.email, deletedAt: null, id: { not: id } },
    });
    if (emailTaken) {
      return NextResponse.json(
        { error: "An active account already uses this email. Cannot unarchive." },
        { status: 409 }
      );
    }

    // Re-activate exactly the positions/contributions/distributions that were
    // cascade-archived together with this user (they share the user's archive
    // timestamp). Rows soft-deleted at any other time are left untouched.
    const archivedAt = existing.deletedAt;
    await prisma.$transaction([
      prisma.clientInvestment.updateMany({
        where: { userId: id, deletedAt: archivedAt },
        data: { deletedAt: null },
      }),
      prisma.contribution.updateMany({
        where: { userId: id, deletedAt: archivedAt },
        data: { deletedAt: null },
      }),
      prisma.distribution.updateMany({
        where: { userId: id, deletedAt: archivedAt },
        data: { deletedAt: null },
      }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: null },
      }),
    ]);

    await createAuditLog({
      userId: user.id,
      action: "RESTORE_CLIENT",
      targetType: "User",
      targetId: id,
      details: { email: existing.email, name: existing.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

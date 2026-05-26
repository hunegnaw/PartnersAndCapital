import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { advisorInviteEmail, getEmailLogoUrl } from "@/lib/email-templates";
import crypto from "crypto";
import { requireNotImpersonating } from "@/lib/impersonation";
import { getPermissionEmailLabel } from "@/lib/advisor-permissions";

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

    if (advisor.status === "REVOKED") {
      return NextResponse.json(
        { error: "Cannot resend invitation to a revoked advisor" },
        { status: 400 }
      );
    }

    // Generate new invitation token
    const invitationToken = crypto.randomUUID();

    await prisma.advisor.update({
      where: { id },
      data: { invitationToken },
    });

    await createAuditLog({
      userId: user.id,
      action: "RESEND_ADVISOR_INVITATION",
      targetType: "Advisor",
      targetId: id,
      details: { email: advisor.email },
      request,
    });

    const clientUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    });

    const access = await prisma.advisorAccess.findFirst({
      where: { advisorId: id },
      select: { permissionLevel: true, expiresAt: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/advisor-accept?token=${invitationToken}`;

    const logoUrl = await getEmailLogoUrl();
    await sendEmail({
      to: advisor.email,
      subject: `${clientUser?.name || "An investor"} has invited you to view their portfolio`,
      html: advisorInviteEmail({
        clientName: clientUser?.name || "An investor",
        advisorName: advisor.name || "Advisor",
        permissionLevel: getPermissionEmailLabel(access?.permissionLevel || ""),
        expiresAt: access?.expiresAt || null,
        acceptUrl,
        logoUrl,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resending advisor invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

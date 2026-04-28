import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { advisorInviteEmail } from "@/lib/email-templates";
import crypto from "crypto";
import { requireNotImpersonating } from "@/lib/impersonation";

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

    const permissionLabels: Record<string, string> = {
      DASHBOARD_ONLY: "Dashboard only — portfolio summary and performance numbers",
      DASHBOARD_AND_TAX_DOCUMENTS: "Dashboard + tax documents (K-1s and 1099s)",
      DASHBOARD_AND_DOCUMENTS: "Dashboard + all documents",
      SPECIFIC_INVESTMENT: "Specific investment access only",
    };

    await sendEmail({
      to: advisor.email,
      subject: `${clientUser?.name || "An investor"} has invited you to view their portfolio`,
      html: advisorInviteEmail({
        clientName: clientUser?.name || "An investor",
        advisorName: advisor.name || "Advisor",
        permissionLevel: permissionLabels[access?.permissionLevel || ""] || access?.permissionLevel || "Portfolio access",
        expiresAt: access?.expiresAt || null,
        acceptUrl,
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

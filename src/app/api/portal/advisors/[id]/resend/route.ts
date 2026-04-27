import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Email sending can be wired later
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resending advisor invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

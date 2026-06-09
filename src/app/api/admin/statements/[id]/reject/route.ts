import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body as { reason?: string };

    const statement = await prisma.statement.findUnique({ where: { id } });

    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    if (statement.status !== "GENERATED") {
      return NextResponse.json(
        { error: `Cannot reject statement with status ${statement.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.statement.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason || null,
      },
    });

    await createAuditLog({
      userId: admin.id,
      action: "REJECT_STATEMENT",
      targetType: "Statement",
      targetId: id,
      details: {
        clientUserId: statement.userId,
        period: statement.statementDate,
        reason,
      },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error rejecting statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const statement = await prisma.statement.findUnique({ where: { id } });
    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    await prisma.statement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: admin.id,
      action: "DELETE_STATEMENT",
      targetType: "Statement",
      targetId: id,
      details: { clientUserId: statement.userId, period: statement.statementDate },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { statementIds, reason } = body as { statementIds: string[]; reason?: string };

    if (!statementIds || statementIds.length === 0) {
      return NextResponse.json({ error: "statementIds required" }, { status: 400 });
    }

    const result = await prisma.statement.updateMany({
      where: { id: { in: statementIds }, status: "GENERATED" },
      data: { status: "REJECTED", rejectionReason: reason || null },
    });

    await createAuditLog({
      userId: admin.id,
      action: "BULK_REJECT_STATEMENTS",
      targetType: "Statement",
      details: { count: result.count, reason, statementIds },
      request,
    });

    return NextResponse.json({ rejected: result.count });
  } catch (error) {
    console.error("Error bulk rejecting statements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

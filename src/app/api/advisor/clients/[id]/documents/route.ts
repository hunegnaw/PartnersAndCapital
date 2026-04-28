import { NextResponse } from "next/server";
import { requireAdvisor } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdvisor();
  if (user instanceof NextResponse) return user;

  const { id: clientId } = await params;

  try {
    // Verify this advisor has active access to this client
    const advisorRecord = await prisma.advisor.findFirst({
      where: {
        advisorUserId: user.id,
        clientId,
        status: "ACTIVE",
      },
      include: {
        client: { select: { name: true } },
        accesses: {
          where: { revokedAt: null },
          select: {
            permissionLevel: true,
            expiresAt: true,
            investmentId: true,
          },
        },
      },
    });

    if (!advisorRecord) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Filter out expired accesses
    const activeAccesses = advisorRecord.accesses.filter(
      (a) => !a.expiresAt || new Date(a.expiresAt) > now
    );

    if (activeAccesses.length === 0) {
      return NextResponse.json(
        { error: "Access expired" },
        { status: 403 }
      );
    }

    const access = activeAccesses[0];
    const permissionLevel = access.permissionLevel;

    // DASHBOARD_ONLY cannot view documents
    if (permissionLevel === "DASHBOARD_ONLY") {
      return NextResponse.json(
        { error: "Your access level does not include documents" },
        { status: 403 }
      );
    }

    // Build document filter based on permission
    const docWhere: Record<string, unknown> = {
      userId: clientId,
      deletedAt: null,
    };

    if (permissionLevel === "DASHBOARD_AND_TAX_DOCUMENTS") {
      docWhere.type = { in: ["K1", "TAX_1099"] };
    }

    if (permissionLevel === "SPECIFIC_INVESTMENT" && access.investmentId) {
      docWhere.investmentId = access.investmentId;
    }

    const documents = await prisma.document.findMany({
      where: docWhere,
      include: {
        investment: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Audit log (fire-and-forget)
    createAuditLog({
      userId: user.id,
      action: "VIEW_DOCUMENTS",
      targetType: "User",
      targetId: clientId,
      details: { permissionLevel, documentCount: documents.length },
      request,
    }).catch(console.error);

    const clientName = advisorRecord.client.name || "Client";

    return NextResponse.json({
      clientName,
      documents: documents.map((d) => ({
        id: d.id,
        title: d.name,
        docType: d.type,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt.toISOString(),
        investmentName: d.investment?.name || null,
      })),
    });
  } catch (error) {
    console.error("Advisor documents error:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}

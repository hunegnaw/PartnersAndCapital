import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getDecryptedFile } from "@/lib/upload";
import { getEffectiveUserId } from "@/lib/impersonation";
import { getAdvisorPermissions } from "@/lib/advisor-permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();
    const { id } = await params;

    // Fetch the document
    const document = await prisma.document.findFirst({
      where: { id, deletedAt: null },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify ownership: document belongs to user directly or via investment
    let hasAccess = false;

    if (document.userId === userId) {
      hasAccess = true;
    } else if (!document.userId && document.investmentId) {
      const clientInvestment = await prisma.clientInvestment.findFirst({
        where: {
          userId,
          investmentId: document.investmentId,
          deletedAt: null,
        },
      });
      if (clientInvestment) {
        hasAccess = true;
      }
    }

    // Advisor access: check if the authenticated user is an advisor with document permissions
    if (!hasAccess && user.role === "ADVISOR") {
      const advisorRecord = await prisma.advisor.findFirst({
        where: {
          advisorUserId: user.id,
          clientId: document.userId ?? undefined,
          status: "ACTIVE",
        },
        include: {
          accesses: {
            where: {
              revokedAt: null,
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
            select: { permissionLevel: true, investmentId: true },
          },
        },
      });

      if (advisorRecord && advisorRecord.accesses.length > 0) {
        for (const access of advisorRecord.accesses) {
          const perms = getAdvisorPermissions(access.permissionLevel);
          if (!perms.canViewDocuments) continue;

          // Investment-scoped access: only allow docs for that investment
          if (access.investmentId && document.investmentId !== access.investmentId) {
            continue;
          }

          // null = all doc types allowed
          if (perms.allowedDocTypes === null) {
            hasAccess = true;
            break;
          }

          // Check if this document's type is in the allowed list
          if (document.type && perms.allowedDocTypes.includes(document.type)) {
            hasAccess = true;
            break;
          }
        }
      }
    }

    // Admin access: admins can always download
    if (!hasAccess && (user.role === "ADMIN" || user.role === "SUPER_ADMIN")) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Decrypt the file
    const fileBuffer = await getDecryptedFile(document.filePath);

    // Audit log the download
    await createAuditLog({
      userId: user.id,
      action: "DOWNLOAD_DOCUMENT",
      targetType: "Document",
      targetId: document.id,
      details: { fileName: document.fileName, documentType: document.type },
      request,
    });

    // Return with security headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

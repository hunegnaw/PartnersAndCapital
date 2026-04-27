import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getDecryptedFile } from "@/lib/upload";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

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

    if (document.userId === user.id) {
      hasAccess = true;
    } else if (document.investmentId) {
      const clientInvestment = await prisma.clientInvestment.findFirst({
        where: {
          userId: user.id,
          investmentId: document.investmentId,
          deletedAt: null,
        },
      });
      if (clientInvestment) {
        hasAccess = true;
      }
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

    // Return as streaming response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
        "Content-Length": String(fileBuffer.length),
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

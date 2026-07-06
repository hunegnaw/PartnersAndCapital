import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getDecryptedFile } from "@/lib/upload";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("type"); // "identity" or "accreditation"

    if (docType !== "identity" && docType !== "accreditation") {
      return NextResponse.json(
        { error: "Type must be 'identity' or 'accreditation'" },
        { status: 400 }
      );
    }

    const verification = await prisma.verification.findFirst({
      where: { id, deletedAt: null },
      select: {
        idDocumentPath: true,
        idDocumentName: true,
        accreditationDocPath: true,
        accreditationDocName: true,
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    const filePath =
      docType === "identity"
        ? verification.idDocumentPath
        : verification.accreditationDocPath;
    const fileName =
      docType === "identity"
        ? verification.idDocumentName
        : verification.accreditationDocName;

    if (!filePath) {
      return NextResponse.json(
        { error: "No document uploaded for this type" },
        { status: 404 }
      );
    }

    const decrypted = await getDecryptedFile(filePath);

    const ext = (fileName || "document").split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(decrypted), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName || "document"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error downloading verification document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

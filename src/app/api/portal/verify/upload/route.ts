import { NextResponse } from "next/server";
import { requireClient } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: Request) {
  try {
    const user = await requireClient();
    if (user instanceof NextResponse) return user;

    const existing = await prisma.verification.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (
      existing &&
      (existing.status === "SUBMITTED" || existing.status === "APPROVED")
    ) {
      return NextResponse.json(
        { error: "Verification already submitted" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docCategory = formData.get("category") as string | null; // "identity" or "accreditation"

    if (!file || !docCategory) {
      return NextResponse.json(
        { error: "File and category are required" },
        { status: 400 }
      );
    }

    if (docCategory !== "identity" && docCategory !== "accreditation") {
      return NextResponse.json(
        { error: "Category must be 'identity' or 'accreditation'" },
        { status: 400 }
      );
    }

    const result = await saveUploadedFile(file, "verification");

    const updateData =
      docCategory === "identity"
        ? {
            idDocumentPath: result.filePath,
            idDocumentName: file.name,
          }
        : {
            accreditationDocPath: result.filePath,
            accreditationDocName: file.name,
          };

    await prisma.verification.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: "IN_PROGRESS",
        ...updateData,
      },
      update: updateData,
    });

    // Also create a Document vault record for accreditation uploads
    if (docCategory === "accreditation") {
      const accreditDocType = formData.get("accreditationDocType") as string;
      await prisma.document.create({
        data: {
          name: `Accreditation Letter - ${accreditDocType || "Verification"}`,
          fileName: file.name,
          filePath: result.filePath,
          fileSize: file.size,
          mimeType: file.type,
          type: "ACCREDITATION_LETTER",
          userId: user.id,
          year: new Date().getFullYear(),
        },
      });
    }

    return NextResponse.json({
      fileName: file.name,
      filePath: result.filePath,
      category: docCategory,
    });
  } catch (error) {
    console.error("Error uploading verification document:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

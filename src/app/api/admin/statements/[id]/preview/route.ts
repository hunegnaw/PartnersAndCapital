import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { decryptStatement } from "@/lib/statement-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const statement = await prisma.statement.findUnique({
      where: { id },
    });

    if (!statement || !statement.filePath) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    const pdfBuffer = await decryptStatement(statement.filePath);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${statement.fileName || "statement.pdf"}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error previewing statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

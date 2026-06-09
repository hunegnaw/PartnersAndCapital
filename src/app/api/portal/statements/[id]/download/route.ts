import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/impersonation";
import { decryptStatement } from "@/lib/statement-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();
    const { id } = await params;

    const statement = await prisma.statement.findUnique({
      where: { id },
    });

    if (
      !statement ||
      statement.userId !== userId ||
      !statement.filePath ||
      !["APPROVED", "SENT"].includes(statement.status)
    ) {
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
    console.error("Error downloading statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

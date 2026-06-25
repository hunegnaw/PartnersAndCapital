import { NextResponse } from "next/server";
import { auth, twoFactorPending } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/impersonation";
import { decryptStatement } from "@/lib/statement-pdf";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // This route is opened directly from the "View Statement" email link, so a
    // logged-out (or 2FA-incomplete) visitor must be sent to login and returned
    // here afterwards — not shown a raw 401 — then served the PDF once signed in.
    const session = await auth();
    if (!session?.user || twoFactorPending(session.user)) {
      const loginUrl = new URL("/login", new URL(request.url).origin);
      loginUrl.searchParams.set("callbackUrl", `/api/portal/statements/${id}/download`);
      return NextResponse.redirect(loginUrl);
    }

    const { userId } = await getEffectiveUserId();

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

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getDecryptedFile } from "@/lib/upload";
import { getEffectiveUserId } from "@/lib/impersonation";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver");
import { PassThrough } from "stream";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 documents per download" },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "No documents found" },
        { status: 404 }
      );
    }

    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { userId, deletedAt: null, investment: { deletedAt: null } },
      select: { investmentId: true },
    });
    const investmentIds = new Set(clientInvestments.map((ci) => ci.investmentId));
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    const accessible = documents.filter((doc) => {
      if (isAdmin) return true;
      if (doc.userId === userId) return true;
      // Fund-wide docs (no specific owner) are visible to all holders of the
      // investment; client-scoped docs are not.
      if (!doc.userId && doc.investmentId && investmentIds.has(doc.investmentId))
        return true;
      return false;
    });

    if (accessible.length === 0) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const passthrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 5 } });
    archive.pipe(passthrough);

    for (const doc of accessible) {
      try {
        const buffer = await getDecryptedFile(doc.filePath);
        archive.append(Buffer.from(buffer), { name: doc.fileName });
      } catch {
        // skip files that fail to decrypt
      }
    }

    await archive.finalize();

    const chunks: Uint8Array[] = [];
    for await (const chunk of passthrough) {
      chunks.push(chunk as Uint8Array);
    }
    const zipBuffer = Buffer.concat(chunks);

    await createAuditLog({
      userId: user.id,
      action: "DOWNLOAD_DOCUMENTS_ZIP",
      targetType: "Document",
      targetId: accessible.map((d) => d.id).join(","),
      details: { count: accessible.length },
      request,
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="documents.zip"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error creating zip:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

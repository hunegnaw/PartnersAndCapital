import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { deleteMediaFile, renameMediaFile } from "@/lib/media-upload";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const media = await prisma.media.findFirst({ where: { id, deletedAt: null } });
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }
  return NextResponse.json(media);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();

  const media = await prisma.media.findFirst({ where: { id, deletedAt: null } });
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Handle file rename if requested
  let renameData: { filePath?: string; fileName?: string } = {};
  if (body.fileName && body.fileName !== media.fileName) {
    try {
      const result = await renameMediaFile(media.filePath, body.fileName);
      renameData = result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Rename failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  const updated = await prisma.media.update({
    where: { id },
    data: {
      ...(renameData.filePath ? { filePath: renameData.filePath } : {}),
      ...(renameData.fileName ? { fileName: renameData.fileName } : {}),
      alt: body.alt !== undefined ? body.alt : undefined,
      caption: body.caption !== undefined ? body.caption : undefined,
    },
  });

  if (renameData.filePath) {
    createAuditLog({
      userId: admin.id,
      action: "RENAME_MEDIA",
      targetType: "MEDIA",
      targetId: id,
      details: { oldPath: media.filePath, newPath: renameData.filePath },
      request,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const media = await prisma.media.findFirst({ where: { id, deletedAt: null } });
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  await prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
  await deleteMediaFile(media.filePath);

  createAuditLog({
    userId: admin.id,
    action: "DELETE_MEDIA",
    targetType: "MEDIA",
    targetId: id,
    details: { fileName: media.fileName },
    request,
  });

  return NextResponse.json({ success: true });
}

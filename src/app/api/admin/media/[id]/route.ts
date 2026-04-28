import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { deleteMediaFile } from "@/lib/media-upload";
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

  const updated = await prisma.media.update({
    where: { id },
    data: {
      alt: body.alt !== undefined ? body.alt : undefined,
      caption: body.caption !== undefined ? body.caption : undefined,
    },
  });

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

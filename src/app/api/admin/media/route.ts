import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { saveMediaFile } from "@/lib/media-upload";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || ""; // image, video, or empty for all
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "24");

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { fileName: { contains: search } },
      { alt: { contains: search } },
      { caption: { contains: search } },
    ];
  }
  if (type === "image") {
    where.mimeType = { startsWith: "image/" };
  } else if (type === "video") {
    where.mimeType = { startsWith: "video/" };
  }

  const [media, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { uploader: { select: { id: true, name: true } } },
    }),
    prisma.media.count({ where }),
  ]);

  return NextResponse.json({
    media,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await saveMediaFile(file);

    const media = await prisma.media.create({
      data: {
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
        uploadedBy: admin.id,
      },
    });

    createAuditLog({
      userId: admin.id,
      action: "UPLOAD_MEDIA",
      targetType: "MEDIA",
      targetId: media.id,
      details: { fileName: result.fileName },
      request,
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

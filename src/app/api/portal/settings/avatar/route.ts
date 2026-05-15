import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireNotImpersonating } from "@/lib/impersonation";
import { saveMediaFile, deleteMediaFile } from "@/lib/media-upload";

const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds maximum of 2MB" },
        { status: 400 }
      );
    }

    // Delete old avatar file if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profileImageUrl: true },
    });
    if (currentUser?.profileImageUrl) {
      await deleteMediaFile(currentUser.profileImageUrl);
    }

    // Save the new avatar
    const result = await saveMediaFile(file);

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImageUrl: result.filePath },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_AVATAR",
      targetType: "User",
      targetId: user.id,
      details: { filePath: result.filePath },
      request,
    });

    return NextResponse.json({ profileImageUrl: result.filePath });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profileImageUrl: true },
    });

    if (currentUser?.profileImageUrl) {
      await deleteMediaFile(currentUser.profileImageUrl);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { profileImageUrl: null },
    });

    await createAuditLog({
      userId: user.id,
      action: "REMOVE_AVATAR",
      targetType: "User",
      targetId: user.id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing avatar:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export interface MediaUploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
}

function getAllowedTypes() {
  return [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
}

export async function saveMediaFile(file: File): Promise<MediaUploadResult> {
  const allAllowed = getAllowedTypes();
  if (!allAllowed.includes(file.type)) {
    throw new Error(
      `File type ${file.type} is not allowed. Allowed: JPEG, PNG, GIF, WebP, SVG, MP4, WebM, MOV`
    );
  }

  const maxSize = ALLOWED_VIDEO_TYPES.includes(file.type)
    ? MAX_VIDEO_SIZE
    : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    throw new Error(`File size exceeds maximum of ${maxMB}MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Generate storage path: public/uploads/media/YYYY/uuid.ext
  const year = new Date().getFullYear().toString();
  const uuid = crypto.randomUUID();
  const ext = getExtension(file.type, file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "media", year);

  await fs.mkdir(uploadDir, { recursive: true });

  const storedFileName = `${uuid}.${ext}`;
  const absolutePath = path.join(uploadDir, storedFileName);

  // Write file directly (public, no encryption)
  await fs.writeFile(absolutePath, buffer);

  // Extract dimensions for images
  let width: number | null = null;
  let height: number | null = null;

  if (ALLOWED_IMAGE_TYPES.includes(file.type) && file.type !== "image/svg+xml") {
    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(buffer).metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
    } catch {
      // Dimensions extraction failed, continue without them
    }
  }

  // Return public URL path
  const publicPath = `/uploads/media/${year}/${storedFileName}`;

  return {
    filePath: publicPath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    width,
    height,
  };
}

function getExtension(mimeType: string, fileName: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  if (map[mimeType]) return map[mimeType];
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "bin";
}

export async function deleteMediaFile(filePath: string): Promise<void> {
  const absolutePath = path.join(process.cwd(), "public", filePath);
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    console.error("Failed to delete media file:", absolutePath, error);
  }
}

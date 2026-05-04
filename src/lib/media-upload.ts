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

/** Slugify a filename stem for URL-safe, SEO-friendly paths */
function slugifyFilename(name: string): string {
  // Remove extension, slugify, then re-add
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";
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

  // Generate SEO-friendly path: public/uploads/media/YYYY/slugified-name-xxxx.ext
  const year = new Date().getFullYear().toString();
  const shortHash = crypto.randomUUID().slice(0, 8);
  const slug = slugifyFilename(file.name);
  const ext = getExtension(file.type, file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "media", year);

  await fs.mkdir(uploadDir, { recursive: true });

  const storedFileName = `${slug}-${shortHash}.${ext}`;
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

/**
 * Rename a media file on disk and return the new public path.
 * Preserves the directory and extension; slugifies the new name.
 */
export async function renameMediaFile(
  currentFilePath: string,
  newName: string
): Promise<{ filePath: string; fileName: string }> {
  const currentAbsolute = path.join(process.cwd(), "public", currentFilePath);
  const dir = path.dirname(currentAbsolute);
  const currentExt = path.extname(currentFilePath);

  // Slugify the new name, keep the same extension
  const slug = slugifyFilename(newName);
  const shortHash = crypto.randomUUID().slice(0, 8);
  const newStoredName = `${slug}-${shortHash}${currentExt}`;
  const newAbsolute = path.join(dir, newStoredName);

  await fs.rename(currentAbsolute, newAbsolute);

  // Build new public path
  const publicDir = path.dirname(currentFilePath);
  const newPublicPath = `${publicDir}/${newStoredName}`;

  // Derive a human-readable fileName (what the user sees)
  const dot = newName.lastIndexOf(".");
  const stem = dot > 0 ? newName.slice(0, dot) : newName;
  const displayName = `${stem}${currentExt}`;

  return { filePath: newPublicPath, fileName: displayName };
}

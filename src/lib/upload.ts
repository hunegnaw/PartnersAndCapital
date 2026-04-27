import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
  return Buffer.from(key, "hex");
}

export interface UploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export async function saveUploadedFile(
  file: File,
  subdir: string = "documents"
): Promise<UploadResult> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of 50MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Generate storage path: uploads/documents/YYYY/uuid.enc
  const year = new Date().getFullYear().toString();
  const uuid = crypto.randomUUID();
  const uploadDir = path.join(process.env.UPLOAD_DIR || "./uploads", subdir, year);

  await fs.mkdir(uploadDir, { recursive: true });

  const encryptedFileName = `${uuid}.enc`;
  const filePath = path.join(uploadDir, encryptedFileName);

  // Encrypt with AES-256-GCM
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store: [16-byte IV][16-byte auth tag][encrypted data]
  const fileData = Buffer.concat([iv, authTag, encrypted]);
  await fs.writeFile(filePath, fileData);

  // Store the relative path (from project root)
  const relativePath = path.relative(process.cwd(), filePath);

  return {
    filePath: relativePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

export async function getDecryptedFile(filePath: string): Promise<Buffer> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  const fileData = await fs.readFile(absolutePath);

  const key = getEncryptionKey();
  const iv = fileData.subarray(0, 16);
  const authTag = fileData.subarray(16, 32);
  const encrypted = fileData.subarray(32);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    console.error("Failed to delete file:", absolutePath, error);
  }
}

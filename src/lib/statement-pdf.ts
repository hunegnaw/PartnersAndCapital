import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";
import { collectStatementData } from "./statement-generator";
import { buildStatementHTML } from "./statement-template";
import { createAuditLog } from "./audit";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
  return Buffer.from(key, "hex");
}

async function encryptAndSave(pdfBuffer: Buffer): Promise<{ filePath: string; fileSize: number }> {
  const year = new Date().getFullYear().toString();
  const uuid = crypto.randomUUID();
  const uploadDir = path.join(process.env.UPLOAD_DIR || "./uploads", "statements", year);
  await fs.mkdir(uploadDir, { recursive: true });

  const encryptedFileName = `${uuid}.enc`;
  const fullPath = path.join(uploadDir, encryptedFileName);

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(pdfBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const fileData = Buffer.concat([iv, authTag, encrypted]);
  await fs.writeFile(fullPath, fileData);

  return {
    filePath: path.relative(process.cwd(), fullPath),
    fileSize: pdfBuffer.length,
  };
}

export async function decryptStatement(filePath: string): Promise<Buffer> {
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

async function renderPDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface GenerateStatementResult {
  statementId: string;
  success: boolean;
  error?: string;
}

export async function generateStatement(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  adminId?: string,
  request?: Request
): Promise<GenerateStatementResult> {
  try {
    const existing = await prisma.statement.findUnique({
      where: { userId_periodStart: { userId, periodStart } },
    });

    if (existing && existing.status !== "REJECTED") {
      return { statementId: existing.id, success: false, error: "Statement already exists for this period" };
    }

    const data = await collectStatementData(userId, periodStart, periodEnd);
    const html = buildStatementHTML(data);
    const pdfBuffer = await renderPDF(html);
    const { filePath, fileSize } = await encryptAndSave(pdfBuffer);

    const monthName = MONTH_NAMES[periodStart.getMonth()];
    const year = periodStart.getFullYear();
    const fileName = `Statement-${monthName}-${year}.pdf`;

    let statement;
    if (existing) {
      statement = await prisma.statement.update({
        where: { id: existing.id },
        data: {
          periodEnd,
          statementDate: data.statementDate,
          status: "GENERATED",
          filePath,
          fileName,
          fileSize,
          generatedAt: new Date(),
          approvedAt: null,
          approvedBy: null,
          sentAt: null,
          rejectionReason: null,
          totalInvested: data.totalInvested,
          currentValue: data.currentValue,
          totalDistributions: data.totalDistributions,
        },
      });
    } else {
      statement = await prisma.statement.create({
        data: {
          userId,
          periodStart,
          periodEnd,
          statementDate: data.statementDate,
          filePath,
          fileName,
          fileSize,
          totalInvested: data.totalInvested,
          currentValue: data.currentValue,
          totalDistributions: data.totalDistributions,
        },
      });
    }

    const bannerAssignments = await prisma.statementBannerAssignment.findMany({
      where: {
        month: periodStart.getMonth() + 1,
        year: periodStart.getFullYear(),
        OR: [{ userId }, { userId: null }],
        banner: { deletedAt: null, isArchived: false },
      },
      select: { bannerId: true },
    });

    const uniqueBannerIds = [...new Set(bannerAssignments.map((a) => a.bannerId))];
    if (uniqueBannerIds.length > 0) {
      await prisma.statementBannerPlacement.deleteMany({
        where: { statementId: statement.id },
      });
      await prisma.statementBannerPlacement.createMany({
        data: uniqueBannerIds.map((bannerId, i) => ({
          statementId: statement.id,
          bannerId,
          sortOrder: i,
        })),
      });
    }

    await createAuditLog({
      userId: adminId,
      action: "GENERATE_STATEMENT",
      targetType: "Statement",
      targetId: statement.id,
      details: {
        clientUserId: userId,
        period: `${monthName} ${year}`,
        totalInvested: data.totalInvested,
        totalDistributions: data.totalDistributions,
      },
      request,
    });

    return { statementId: statement.id, success: true };
  } catch (error) {
    console.error(`Failed to generate statement for user ${userId}:`, error);
    return {
      statementId: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function generateBatchStatements(
  userIds: string[],
  periodStart: Date,
  periodEnd: Date,
  adminId?: string,
  request?: Request
): Promise<{ total: number; success: number; failed: number; results: GenerateStatementResult[] }> {
  const results: GenerateStatementResult[] = [];
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await generateStatement(userId, periodStart, periodEnd, adminId, request);
    results.push(result);
    if (result.success) success++;
    else failed++;
  }

  await createAuditLog({
    userId: adminId,
    action: "BATCH_GENERATE_STATEMENTS",
    targetType: "Statement",
    details: {
      total: userIds.length,
      success,
      failed,
      period: `${MONTH_NAMES[periodStart.getMonth()]} ${periodStart.getFullYear()}`,
    },
    request,
  });

  return { total: userIds.length, success, failed, results };
}

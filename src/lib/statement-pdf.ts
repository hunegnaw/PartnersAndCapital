import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { collectStatementData, type StatementData, type StatementInvestmentData } from "./statement-generator";
import { renderChartSVG, renderMiniChartSVG, prepareChartData } from "./statement-chart";
import { createAuditLog } from "./audit";

const NAVY = "#1A2640";
const GOLD = "#B07D3A";
const GOLD_LIGHT = "#E8D5B0";
const GRAY = "#666666";
const LIGHT_BG = "#FAF8F5";
const TABLE_HEADER_BG = "#F5F3EE";
const BORDER = "#E8E5E0";
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_DIR = path.join(process.cwd(), "fonts");
const FONT_REGULAR = path.join(FONT_DIR, "Inter-Regular.ttf");
const FONT_BOLD = path.join(FONT_DIR, "Inter-Bold.ttf");
const FONT_HEADING = path.join(FONT_DIR, "CormorantGaramond-Medium.ttf");

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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function formatActivityDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

async function svgToPng(svg: string, width: number, height: number): Promise<Buffer> {
  const svgBuf = Buffer.from(svg);
  return sharp(svgBuf).resize(width * 2, height * 2).png().toBuffer();
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_H - 60) {
    doc.addPage();
    doc.y = MARGIN;
  }
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  cols: { text: string; width: number; align?: "left" | "right" }[],
  y: number,
  opts: { bg?: string; bold?: boolean; fontSize?: number } = {}
) {
  const fontSize = opts.fontSize || 9;
  if (opts.bg) {
    doc.save().rect(MARGIN, y, CONTENT_W, 22).fill(opts.bg).restore();
  }
  let x = MARGIN + 8;
  for (const col of cols) {
    doc.font(opts.bold ? "InterBold" : "Inter")
      .fontSize(fontSize)
      .fillColor("#333333");
    if (col.align === "right") {
      doc.text(col.text, x, y + 6, { width: col.width - 8, align: "right" });
    } else {
      doc.text(col.text, x, y + 6, { width: col.width - 8 });
    }
    x += col.width;
  }
}

function drawActivityTable(
  doc: PDFKit.PDFDocument,
  title: string,
  items: StatementInvestmentData["recentActivity"],
  totalLabel?: string,
  totalAmount?: number
) {
  ensureSpace(doc, 60);
  doc.font("InterBold").fontSize(8).fillColor(GRAY)
    .text(title.toUpperCase(), MARGIN, doc.y, { characterSpacing: 0.5 });
  doc.moveDown(0.3);

  const colW = [100, 140, 120, CONTENT_W - 360];
  const headerY = doc.y;
  drawTableRow(doc, [
    { text: "POSTED DATE", width: colW[0] },
    { text: "DESCRIPTION", width: colW[1] },
    { text: "PAYMENT METHOD", width: colW[2] },
    { text: "AMOUNT", width: colW[3], align: "right" },
  ], headerY, { bg: TABLE_HEADER_BG, bold: true, fontSize: 7 });
  doc.y = headerY + 24;

  if (items.length === 0) {
    doc.font("Inter").fontSize(9).fillColor("#999999")
      .text("No activity this period", MARGIN + 8, doc.y + 4);
    doc.y += 24;
  } else {
    for (const item of items) {
      ensureSpace(doc, 24);
      const rowY = doc.y;
      drawTableRow(doc, [
        { text: formatActivityDate(item.date), width: colW[0] },
        { text: item.description, width: colW[1] },
        { text: item.paymentMethod, width: colW[2] },
        { text: formatCurrency(item.amount), width: colW[3], align: "right" },
      ], rowY);
      doc.y = rowY + 22;
      doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y)
        .strokeColor("#F0EDE8").lineWidth(0.5).stroke().restore();
    }
  }

  if (totalLabel && totalAmount !== undefined) {
    ensureSpace(doc, 24);
    const totalY = doc.y;
    drawTableRow(doc, [
      { text: totalLabel, width: colW[0] + colW[1] + colW[2] },
      { text: formatCurrency(totalAmount), width: colW[3], align: "right" },
    ], totalY, { bg: LIGHT_BG, bold: true });
    doc.y = totalY + 24;
  }

  doc.y += 4;
}

async function renderPDF(data: StatementData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "letter", margin: 0, bufferPages: true, font: FONT_REGULAR });
      doc.registerFont("Inter", FONT_REGULAR);
      doc.registerFont("InterBold", FONT_BOLD);
      doc.registerFont("Cormorant", FONT_HEADING);
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── HEADER ──
      doc.save().rect(0, 0, PAGE_W, 64).fill(NAVY).restore();
      doc.font("Cormorant").fontSize(18).fillColor(GOLD_LIGHT)
        .text("PARTNERS", MARGIN, 16, { continued: true })
        .fillColor("#FFFFFF").text(" + CAPITAL");
      doc.font("Inter").fontSize(6).fillColor("#8899BB")
        .text("PUBLIC ACCESS TO PRIVATE MARKETS", MARGIN, 40);
      doc.font("Inter").fontSize(7).fillColor("#FFFFFF")
        .text("STATEMENT", PAGE_W - MARGIN - 120, 18, { width: 120, align: "right" });
      doc.font("Cormorant").fontSize(18).fillColor("#FFFFFF")
        .text(data.statementDate, PAGE_W - MARGIN - 120, 30, { width: 120, align: "right" });

      // Gold line
      doc.save().rect(0, 64, PAGE_W, 3)
        .fill(GOLD).restore();
      doc.y = 80;

      // ── CLIENT INFO ──
      doc.font("Inter").fontSize(7).fillColor("#999999")
        .text("CLIENT", MARGIN, doc.y);
      doc.font("Cormorant").fontSize(22).fillColor(NAVY)
        .text(data.clientName, MARGIN, doc.y + 12);

      doc.font("Inter").fontSize(7).fillColor("#999999")
        .text("TOTAL AMOUNT INVESTED", PAGE_W - MARGIN - 160, 80, { width: 160, align: "right" });
      doc.font("Cormorant").fontSize(22).fillColor(NAVY)
        .text(formatCurrency(data.totalInvested), PAGE_W - MARGIN - 160, 92, { width: 160, align: "right" });

      doc.y = 118;
      doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(GOLD).lineWidth(2).stroke().restore();
      doc.y += 12;

      // ── BANNERS ──
      for (const banner of data.banners) {
        ensureSpace(doc, 80);
        const bannerY = doc.y;
        doc.save().roundedRect(MARGIN, bannerY, CONTENT_W, 70, 4)
          .fill(banner.gradientTo).restore();
        doc.font("InterBold").fontSize(13).fillColor(GOLD_LIGHT)
          .text(banner.title, MARGIN + 20, bannerY + 14, { width: CONTENT_W - 40 });
        if (banner.description) {
          doc.font("Inter").fontSize(9).fillColor("#FFFFFF")
            .text(banner.description, MARGIN + 20, bannerY + 32, { width: CONTENT_W - 40 });
        }
        if (banner.buttonText) {
          doc.save().roundedRect(MARGIN + 20, bannerY + 50, 80, 16, 3).fill(GOLD).restore();
          doc.font("InterBold").fontSize(8).fillColor("#FFFFFF")
            .text(banner.buttonText, MARGIN + 24, bannerY + 53, { width: 72 });
        }
        doc.y = bannerY + 78;
      }

      // ── PORTFOLIO SUMMARY ──
      ensureSpace(doc, 60);
      const summaryY = doc.y;
      const metrics = [
        { label: "Portfolio Value", value: formatCurrency(data.currentValue), color: NAVY },
        { label: "Total Distributions", value: formatCurrency(data.totalDistributions), color: GOLD },
        { label: "Total Return", value: formatPct(data.totalReturnPct), color: NAVY },
      ];
      if (data.weightedIrr) metrics.push({ label: "Net IRR", value: formatPct(data.weightedIrr), color: NAVY });
      if (data.weightedApr) metrics.push({ label: "Net APR", value: formatPct(data.weightedApr), color: NAVY });

      let mx = MARGIN;
      for (const m of metrics) {
        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text(m.label.toUpperCase(), mx, summaryY, { width: 100 });
        doc.font("InterBold").fontSize(16).fillColor(m.color)
          .text(m.value, mx, summaryY + 12);
        mx += 105;
      }
      doc.y = summaryY + 36;

      // ── COMBINED CHART ──
      if (data.combinedChartData.length > 1) {
        ensureSpace(doc, 160);
        const chartData = prepareChartData(data.combinedChartData);
        try {
          const svgStr = renderChartSVG(chartData, 532, 150);
          const chartPng = await svgToPng(svgStr, 532, 150);
          doc.save()
            .roundedRect(MARGIN, doc.y, CONTENT_W, 170, 4)
            .fill(LIGHT_BG).restore();
          doc.font("InterBold").fontSize(7).fillColor(GRAY)
            .text("PORTFOLIO PERFORMANCE", MARGIN + 12, doc.y + 8);
          doc.image(chartPng, MARGIN + 6, doc.y + 22, { width: CONTENT_W - 12, height: 140 });
          doc.y += 178;
        } catch {
          doc.y += 10;
        }
      }

      // ── INVESTMENT SECTIONS ──
      for (const inv of data.investments) {
        ensureSpace(doc, 100);

        // Section header
        doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.y += 8;

        doc.font("Cormorant").fontSize(16).fillColor(NAVY)
          .text(inv.investmentName, MARGIN, doc.y);
        doc.font("Inter").fontSize(9).fillColor("#999999")
          .text(inv.assetClassName, MARGIN, doc.y + 18);

        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text("AMOUNT INVESTED", PAGE_W - MARGIN - 140, doc.y, { width: 140, align: "right" });
        doc.font("Cormorant").fontSize(16).fillColor(NAVY)
          .text(formatCurrency(inv.amountInvested), PAGE_W - MARGIN - 140, doc.y + 12, { width: 140, align: "right" });

        doc.y += 36;

        // Investment metrics row
        const invMetrics = [
          { label: "Invested", value: formatCurrency(inv.amountInvested) },
          { label: "Current Value", value: formatCurrency(inv.currentValue) },
          { label: "Distributed", value: formatCurrency(inv.cashDistributed) },
          { label: "ROI", value: formatPct(inv.returnPercentage) },
        ];
        if (inv.irr != null) invMetrics.push({ label: "IRR", value: formatPct(inv.irr) });
        if (inv.apr != null) invMetrics.push({ label: "APR", value: formatPct(inv.apr) });

        let imx = MARGIN;
        for (const m of invMetrics) {
          doc.font("Inter").fontSize(6).fillColor("#999999")
            .text(m.label.toUpperCase(), imx, doc.y);
          doc.font("InterBold").fontSize(11).fillColor(NAVY)
            .text(m.value, imx, doc.y + 9);
          imx += 85;
        }
        doc.y += 28;

        // Mini chart
        if (inv.chartData.length > 1) {
          ensureSpace(doc, 120);
          try {
            const miniData = inv.chartData.map((d) => {
              const [y, m] = d.month.split("-");
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return { month: d.month, label: `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`, value: d.value, distributions: d.distributions };
            });
            const miniSvg = renderMiniChartSVG(miniData, 532, 100);
            const miniPng = await svgToPng(miniSvg, 532, 100);
            doc.save().roundedRect(MARGIN, doc.y, CONTENT_W, 110, 4).fill(LIGHT_BG).restore();
            doc.image(miniPng, MARGIN + 6, doc.y + 6, { width: CONTENT_W - 12, height: 98 });
            doc.y += 116;
          } catch {
            doc.y += 4;
          }
        }

        // Activity tables
        drawActivityTable(doc, "Recent Payments & Credits", inv.recentActivity);
        drawActivityTable(
          doc,
          "Previous Payments & Activity",
          inv.previousActivity,
          "Total Deposits YTD",
          inv.totalDepositsYTD + inv.totalDistributionsYTD
        );
        doc.y += 8;
      }

      // ── DISCLOSURES ──
      if (data.disclosures.length > 0) {
        ensureSpace(doc, 80);
        doc.font("Cormorant").fontSize(18).fillColor(NAVY)
          .text("Disclosures", MARGIN, doc.y);
        doc.y += 4;
        doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.y += 10;

        for (const d of data.disclosures) {
          ensureSpace(doc, 40);
          doc.font("InterBold").fontSize(9).fillColor("#333333")
            .text(d.title, MARGIN, doc.y, { width: CONTENT_W });
          doc.moveDown(0.2);
          doc.font("Inter").fontSize(8).fillColor(GRAY)
            .text(d.body, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
          doc.moveDown(0.6);
        }
      }

      // ── FOOTER ──
      ensureSpace(doc, 40);
      doc.y += 8;
      doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
      doc.y += 8;
      const orgLegal = data.org.legalName || data.org.name;
      doc.font("Inter").fontSize(8).fillColor("#999999")
        .text(`© ${new Date().getFullYear()} ${orgLegal}`, MARGIN, doc.y);
      doc.y += 14;
      doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
      doc.y += 6;
      const footerParts = [orgLegal, data.org.email, data.org.address].filter(Boolean);
      doc.font("Inter").fontSize(7).fillColor("#999999")
        .text(footerParts.join(" | "), MARGIN, doc.y, { width: CONTENT_W, align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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
    const pdfBuffer = await renderPDF(data);
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

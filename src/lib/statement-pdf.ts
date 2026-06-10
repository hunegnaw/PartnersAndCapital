import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { collectStatementData, type StatementData, type StatementInvestmentData } from "./statement-generator";
import { renderChartSVG, renderMiniChartSVG, renderDonutSVG, prepareChartData, type ChartLabels } from "./statement-chart";
import { createAuditLog } from "./audit";

const NAVY = "#1A2640";
const GOLD = "#B07D3A";
const GOLD_LIGHT = "#E8D5B0";
const GRAY = "#666666";
const LIGHT_BG = "#FAF8F5";
const TABLE_HEADER_BG = "#F5F3EE";
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

function drawChartLabels(
  doc: PDFKit.PDFDocument,
  labels: ChartLabels,
  imgX: number,
  imgY: number,
  imgW: number,
  imgH: number
) {
  for (const tick of labels.leftTicks) {
    const y = imgY + tick.y * imgH;
    doc.font("Inter").fontSize(7).fillColor(GRAY)
      .text(tick.label, imgX - 48, y - 4, { width: 44, align: "right", lineBreak: false });
  }

  for (const tick of labels.rightTicks) {
    const y = imgY + tick.y * imgH;
    doc.font("Inter").fontSize(7).fillColor(GOLD);
    const tw = doc.widthOfString(tick.label);
    doc.text(tick.label, imgX + imgW + 6, y - 4, { width: tw + 2, lineBreak: false });
  }

  for (const xl of labels.xLabels) {
    const x = imgX + xl.x * imgW;
    doc.font("Inter").fontSize(7).fillColor(GRAY)
      .text(xl.label, x - 22, imgY + imgH + 4, { width: 44, align: "center", lineBreak: false });
  }
}

const FOOTER_H = 50;

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_H - FOOTER_H - 10) {
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
      doc.text(col.text, x, y + 6, { width: col.width - 8, align: "right", lineBreak: false });
    } else {
      doc.text(col.text, x, y + 6, { width: col.width - 8, lineBreak: false });
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
  const titleY = doc.y;
  doc.font("InterBold").fontSize(8).fillColor(GRAY)
    .text(title.toUpperCase(), MARGIN, titleY, { characterSpacing: 0.5, lineBreak: false });
  doc.y = titleY + 14;

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
      .text("No activity this period", MARGIN + 8, doc.y + 4, { lineBreak: false });
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

      // Logo from settings or text fallback
      let logoDrawn = false;
      if (data.org.logoUrl && !data.org.logoUrl.startsWith("http")) {
        try {
          const candidates = [
            path.join(process.cwd(), "public", data.org.logoUrl),
            path.join(process.cwd(), data.org.logoUrl),
          ];
          for (const logoPath of candidates) {
            const logoExists = await fs.access(logoPath).then(() => true).catch(() => false);
            if (logoExists) {
              doc.image(logoPath, MARGIN, 18, { height: 24 });
              logoDrawn = true;
              break;
            }
          }
        } catch { /* fallback to text */ }
      }
      if (!logoDrawn) {
        doc.font("Cormorant").fontSize(18).fillColor(GOLD_LIGHT)
          .text("PARTNERS", MARGIN, 16, { continued: true, lineBreak: false })
          .fillColor("#FFFFFF").text(" + CAPITAL", { lineBreak: false });
        doc.font("Inter").fontSize(6).fillColor("#8899BB")
          .text("PUBLIC ACCESS TO PRIVATE MARKETS", MARGIN, 40, { lineBreak: false });
      }
      doc.font("Inter").fontSize(7).fillColor("#FFFFFF")
        .text("STATEMENT", PAGE_W - MARGIN - 120, 18, { width: 120, align: "right", lineBreak: false });
      doc.font("Cormorant").fontSize(18).fillColor("#FFFFFF")
        .text(data.statementDate, PAGE_W - MARGIN - 120, 30, { width: 120, align: "right", lineBreak: false });

      // Gold line
      doc.save().rect(0, 64, PAGE_W, 3).fill(GOLD).restore();

      // ── CUSTOMER SERVICE ──
      const csItems: { label: string; value: string }[] = [];
      if (data.org.phone) csItems.push({ label: "Phone", value: data.org.phone });
      if (data.org.email) csItems.push({ label: "Email", value: data.org.email });
      if (data.org.website) csItems.push({ label: "Web", value: data.org.website });

      let csEndY = 80;
      if (csItems.length > 0) {
        doc.save().rect(0, 67, PAGE_W, 42).fill("#F5F3EE").restore();
        doc.font("Cormorant").fontSize(11).fillColor(NAVY)
          .text("Customer Service", MARGIN, 72, { lineBreak: false });
        let csx = MARGIN;
        for (const cs of csItems) {
          doc.font("InterBold").fontSize(6).fillColor("#999999")
            .text(cs.label.toUpperCase(), csx, 86, { lineBreak: false });
          doc.font("Inter").fontSize(8).fillColor(NAVY)
            .text(cs.value, csx, 94, { lineBreak: false });
          csx += 170;
        }
        csEndY = 116;
      }
      doc.y = csEndY;

      // ── CLIENT INFO ──
      const clientY = doc.y;
      doc.font("Inter").fontSize(7).fillColor("#999999")
        .text("CLIENT", MARGIN, clientY, { lineBreak: false });
      doc.font("Cormorant").fontSize(22).fillColor(NAVY)
        .text(data.clientName, MARGIN, clientY + 10, { lineBreak: false });

      doc.font("Inter").fontSize(7).fillColor("#999999")
        .text("TOTAL AMOUNT INVESTED", PAGE_W - MARGIN - 160, clientY, { width: 160, align: "right", lineBreak: false });
      doc.font("Cormorant").fontSize(22).fillColor(NAVY)
        .text(formatCurrency(data.totalInvested), PAGE_W - MARGIN - 160, clientY + 10, { width: 160, align: "right", lineBreak: false });

      doc.y = clientY + 38;
      doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(GOLD).lineWidth(2).stroke().restore();
      doc.y += 12;

      // ── BANNERS ──
      for (const banner of data.banners) {
        ensureSpace(doc, 90);
        const bannerY = doc.y;
        const bannerH = 80;
        const bannerColor = banner.gradientTo || NAVY;

        // Draw image first (full width, clipped to banner bounds)
        let hasImage = false;
        if (banner.imageUrl) {
          try {
            const imgCandidates = [
              path.join(process.cwd(), "public", banner.imageUrl),
              path.join(process.cwd(), banner.imageUrl),
            ];
            for (const imgPath of imgCandidates) {
              const exists = await fs.access(imgPath).then(() => true).catch(() => false);
              if (exists) {
                doc.save().roundedRect(MARGIN, bannerY, CONTENT_W, bannerH, 4).clip();
                doc.image(imgPath, MARGIN, bannerY, { height: bannerH, width: CONTENT_W * 0.45 });
                doc.restore();
                hasImage = true;
                break;
              }
            }
          } catch { /* skip image */ }
        }

        // Navy overlay — covers right portion, overlaps image edge to create fade effect
        const overlayX = hasImage ? MARGIN + CONTENT_W * 0.3 : MARGIN;
        const overlayW = hasImage ? CONTENT_W * 0.7 + MARGIN - overlayX + MARGIN : CONTENT_W;
        if (!hasImage) {
          doc.save().roundedRect(MARGIN, bannerY, CONTENT_W, bannerH, 4)
            .fill(bannerColor).restore();
        } else {
          doc.save().roundedRect(MARGIN, bannerY, CONTENT_W, bannerH, 4).clip();
          doc.rect(overlayX, bannerY, overlayW, bannerH).fill(bannerColor);
          doc.restore();
        }

        // Text content on right side
        const textX = hasImage ? MARGIN + CONTENT_W * 0.38 : MARGIN + 20;
        const textW = CONTENT_W - (textX - MARGIN) - 16;
        doc.font("Cormorant").fontSize(18).fillColor(GOLD_LIGHT)
          .text(banner.title, textX, bannerY + 12, { width: textW, lineBreak: false });
        if (banner.description) {
          doc.font("Inter").fontSize(9).fillColor("#FFFFFF")
            .text(banner.description, textX, bannerY + 34, { width: textW, lineBreak: false });
        }
        if (banner.buttonText) {
          doc.save().roundedRect(textX, bannerY + 52, 90, 18, 4).fill(GOLD).restore();
          doc.font("InterBold").fontSize(9).fillColor("#FFFFFF")
            .text(banner.buttonText, textX + 8, bannerY + 56, { width: 74, lineBreak: false, link: banner.buttonUrl || undefined });
        }
        doc.y = bannerY + 88;
      }

      // Gold line below banners (separator before portfolio section)
      if (data.banners.length > 0) {
        doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.y += 12;
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
          .text(m.label.toUpperCase(), mx, summaryY, { width: 100, lineBreak: false });
        doc.font("InterBold").fontSize(16).fillColor(m.color)
          .text(m.value, mx, summaryY + 10, { width: 100, lineBreak: false });
        mx += 105;
      }
      doc.y = summaryY + 32;

      // ── COMBINED CHART ──
      if (data.combinedChartData.length >= 1) {
        ensureSpace(doc, 190);
        const chartData = prepareChartData(data.combinedChartData);
        try {
          const { svg: svgStr, labels } = renderChartSVG(chartData, 420, 140);
          const chartPng = await svgToPng(svgStr, 420, 140);
          const boxY = doc.y;
          doc.save()
            .roundedRect(MARGIN, boxY, CONTENT_W, 190, 4)
            .fill(LIGHT_BG).restore();
          doc.font("InterBold").fontSize(7).fillColor(GRAY)
            .text("PORTFOLIO PERFORMANCE", MARGIN + 12, boxY + 8, { lineBreak: false });
          const imgX = MARGIN + 50;
          const imgY = boxY + 24;
          const imgW = CONTENT_W - 110;
          const imgH = 140;
          doc.image(chartPng, imgX, imgY, { width: imgW, height: imgH });
          drawChartLabels(doc, labels, imgX, imgY + 6, imgW, imgH - 20);
          doc.y = boxY + 198;
        } catch {
          doc.y += 10;
        }
      }

      // ── DONUT CHARTS (Asset Class + Investment Allocation) ──
      if (data.allocation.length >= 1) {
        const donutRows = Math.max(data.allocation.length, data.investmentAllocation.length);
        const donutBoxH = Math.max(120, 28 + donutRows * 18);
        ensureSpace(doc, donutBoxH + 10);
        const donutBoxY = doc.y;
        doc.save()
          .roundedRect(MARGIN, donutBoxY, CONTENT_W, donutBoxH, 4)
          .fill(LIGHT_BG).restore();

        const halfW = CONTENT_W / 2;

        // Left donut: Asset Class Allocation
        doc.font("InterBold").fontSize(7).fillColor(GRAY)
          .text("ASSET CLASS ALLOCATION", MARGIN + 12, donutBoxY + 8, { lineBreak: false });
        try {
          const d1Svg = renderDonutSVG(data.allocation, 80);
          const d1Png = await svgToPng(d1Svg, 80, 80);
          doc.image(d1Png, MARGIN + 12, donutBoxY + 22, { width: 70, height: 70 });
        } catch { /* skip */ }

        const leg1X = MARGIN + 90;
        let leg1Y = donutBoxY + 24;
        const total1 = data.allocation.reduce((s, a) => s + a.value, 0);
        for (const a of data.allocation) {
          const pct = total1 > 0 ? Math.round((a.value / total1) * 100) : 0;
          doc.save().roundedRect(leg1X, leg1Y + 1, 6, 6, 1).fill(a.color).restore();
          doc.font("Inter").fontSize(7).fillColor(NAVY)
            .text(`${a.name} — ${formatCurrency(a.value)} (${pct}%)`, leg1X + 10, leg1Y, { lineBreak: false });
          leg1Y += 16;
        }

        // Right donut: Investment Allocation
        const rightX = MARGIN + halfW;
        doc.font("InterBold").fontSize(7).fillColor(GRAY)
          .text("INVESTMENT ALLOCATION", rightX + 12, donutBoxY + 8, { lineBreak: false });
        try {
          const d2Svg = renderDonutSVG(data.investmentAllocation, 80);
          const d2Png = await svgToPng(d2Svg, 80, 80);
          doc.image(d2Png, rightX + 12, donutBoxY + 22, { width: 70, height: 70 });
        } catch { /* skip */ }

        const leg2X = rightX + 90;
        let leg2Y = donutBoxY + 24;
        const total2 = data.investmentAllocation.reduce((s, a) => s + a.value, 0);
        for (const a of data.investmentAllocation) {
          const pct = total2 > 0 ? Math.round((a.value / total2) * 100) : 0;
          doc.font("Inter").fontSize(7).fillColor(NAVY)
            .text(`${a.name}`, leg2X + 10, leg2Y, { lineBreak: false });
          doc.save().roundedRect(leg2X, leg2Y + 1, 6, 6, 1).fill(a.color).restore();
          doc.font("Inter").fontSize(7).fillColor(GRAY)
            .text(`${formatCurrency(a.value)} (${pct}%)`, leg2X + 10, leg2Y + 10, { lineBreak: false });
          leg2Y += 22;
        }

        doc.y = donutBoxY + donutBoxH + 8;
      }

      // ── INVESTMENT SECTIONS ──
      for (const inv of data.investments) {
        ensureSpace(doc, 100);

        // Section header
        doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.y += 8;

        const invHeaderY = doc.y;
        doc.font("Cormorant").fontSize(16).fillColor(NAVY)
          .text(inv.investmentName, MARGIN, invHeaderY, { lineBreak: false });
        doc.font("Inter").fontSize(9).fillColor("#999999")
          .text(inv.assetClassName, MARGIN, invHeaderY + 20, { lineBreak: false });

        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text("AMOUNT INVESTED", PAGE_W - MARGIN - 140, invHeaderY, { width: 140, align: "right", lineBreak: false });
        doc.font("Cormorant").fontSize(16).fillColor(NAVY)
          .text(formatCurrency(inv.amountInvested), PAGE_W - MARGIN - 140, invHeaderY + 12, { width: 140, align: "right", lineBreak: false });

        doc.y = invHeaderY + 38;

        // Investment metrics row
        const invMetrics = [
          { label: "Invested", value: formatCurrency(inv.amountInvested) },
          { label: "Current Value", value: formatCurrency(inv.currentValue) },
          { label: "Distributed", value: formatCurrency(inv.cashDistributed) },
          { label: "ROI", value: formatPct(inv.returnPercentage) },
        ];
        if (inv.irr != null) invMetrics.push({ label: "IRR", value: formatPct(inv.irr) });
        if (inv.apr != null) invMetrics.push({ label: "APR", value: formatPct(inv.apr) });

        const metricsY = doc.y;
        let imx = MARGIN;
        for (const m of invMetrics) {
          doc.font("Inter").fontSize(6).fillColor("#999999")
            .text(m.label.toUpperCase(), imx, metricsY, { lineBreak: false });
          doc.font("InterBold").fontSize(11).fillColor(NAVY)
            .text(m.value, imx, metricsY + 9, { lineBreak: false });
          imx += 85;
        }
        doc.y = metricsY + 26;

        // Mini chart
        if (inv.chartData.length >= 1) {
          ensureSpace(doc, 140);
          try {
            const miniData = inv.chartData.map((d) => {
              const [y, m] = d.month.split("-");
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return { month: d.month, label: `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`, value: d.value, distributions: d.distributions };
            });
            const { svg: miniSvg, labels: miniLabels } = renderMiniChartSVG(miniData, 380, 90);
            const miniPng = await svgToPng(miniSvg, 380, 90);
            const miniBoxY = doc.y;
            doc.save().roundedRect(MARGIN, miniBoxY, CONTENT_W, 130, 4).fill(LIGHT_BG).restore();
            const mImgX = MARGIN + 50;
            const mImgY = miniBoxY + 8;
            const mImgW = CONTENT_W - 110;
            const mImgH = 90;
            doc.image(miniPng, mImgX, mImgY, { width: mImgW, height: mImgH });
            drawChartLabels(doc, miniLabels, mImgX, mImgY + 5, mImgW, mImgH - 16);
            doc.y = miniBoxY + 136;
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

      // ── FOOTER ON EVERY PAGE ──
      const orgLegal = data.org.legalName || data.org.name;
      const footerParts = [orgLegal, data.org.email, data.org.address].filter(Boolean);
      const pageCount = doc.bufferedPageRange().count;
      for (let p = 0; p < pageCount; p++) {
        doc.switchToPage(p);
        const footerY = PAGE_H - FOOTER_H;
        doc.save().moveTo(0, footerY).lineTo(PAGE_W, footerY)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.save().rect(0, footerY + 1.5, PAGE_W, FOOTER_H).fill("#F5F3EE").restore();
        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text(`© ${new Date().getFullYear()} ${orgLegal}`, MARGIN, footerY + 8, { lineBreak: false });
        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text(footerParts.join("  |  "), MARGIN, footerY + 22, { width: CONTENT_W, align: "center", lineBreak: false });
      }

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

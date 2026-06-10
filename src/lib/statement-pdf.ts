import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { collectStatementData, type StatementData, type StatementInvestmentData } from "./statement-generator";
import { renderChartSVG, renderMiniChartSVG, renderDonutSVG, prepareChartData, formatCompact } from "./statement-chart";
import { createAuditLog } from "./audit";
import { renderBannerImage } from "./statement-banner";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
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

function drawChartAxes(
  doc: PDFKit.PDFDocument,
  imgX: number,
  imgY: number,
  imgW: number,
  imgH: number,
  leftMax: number,
  rightMax: number,
  xLabels: string[]
) {
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const y = imgY + frac * imgH;

    const leftVal = leftMax * (1 - frac);
    doc.font("Inter").fontSize(7).fillColor(GRAY)
      .text(formatCompact(leftVal), imgX - 48, y - 4, { width: 44, align: "right", lineBreak: false });

    if (rightMax > 0) {
      const rightVal = rightMax * (1 - frac);
      const label = formatCompact(rightVal);
      doc.font("Inter").fontSize(7).fillColor(GOLD)
        .text(label, imgX + imgW + 6, y - 4, { lineBreak: false });
    }
  }

  const interval = Math.max(1, Math.floor(xLabels.length / 8));
  for (let i = 0; i < xLabels.length; i += interval) {
    const x = imgX + (i / Math.max(xLabels.length - 1, 1)) * imgW;
    doc.font("Inter").fontSize(6).fillColor(GRAY)
      .text(xLabels[i], x - 20, imgY + imgH + 16, { width: 40, align: "center", lineBreak: false });
  }
}

const FOOTER_H = 50;
const CONT_HEADER_H = 36;

let _contHeaderData: { statementDate: string; logoPath: string | null } | null = null;

function startNewPage(doc: PDFKit.PDFDocument) {
  doc.addPage();
  if (_contHeaderData) {
    // Mini header: small navy bar with logo + date
    doc.save().rect(0, 0, PAGE_W, CONT_HEADER_H).fill(NAVY).restore();
    doc.save().rect(0, CONT_HEADER_H, PAGE_W, 2).fill(GOLD).restore();
    if (_contHeaderData.logoPath) {
      try {
        doc.image(_contHeaderData.logoPath, MARGIN, 8, { height: 18 });
      } catch {
        doc.font("Cormorant").fontSize(11).fillColor(GOLD_LIGHT)
          .text("PARTNERS", MARGIN, 10, { continued: true, lineBreak: false })
          .fillColor("#FFFFFF").text(" + CAPITAL", { lineBreak: false });
      }
    } else {
      doc.font("Cormorant").fontSize(11).fillColor(GOLD_LIGHT)
        .text("PARTNERS", MARGIN, 10, { continued: true, lineBreak: false })
        .fillColor("#FFFFFF").text(" + CAPITAL", { lineBreak: false });
    }
    doc.font("Cormorant").fontSize(12).fillColor("#FFFFFF")
      .text(_contHeaderData.statementDate, PAGE_W - MARGIN - 100, 11, { width: 100, align: "right", lineBreak: false });
    doc.y = CONT_HEADER_H + 14;
  } else {
    doc.y = MARGIN;
  }
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_H - FOOTER_H - 10) {
    startNewPage(doc);
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
      let resolvedLogoPath: string | null = null;
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
              resolvedLogoPath = logoPath;
              break;
            }
          }
        } catch { /* fallback to text */ }
      }
      _contHeaderData = { statementDate: data.statementDate, logoPath: resolvedLogoPath };
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

      doc.y = clientY + 42;
      doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(GOLD).lineWidth(2).stroke().restore();
      doc.y += 16;

      // ── BANNERS (rendered via satori for pixel-perfect match with web preview) ──
      for (const banner of data.banners) {
        try {
          const { png: bannerPng, height: bannerH } = await renderBannerImage(banner, CONTENT_W);
          ensureSpace(doc, bannerH + 16);
          const bannerY = doc.y;
          doc.image(bannerPng, MARGIN, bannerY, { width: CONTENT_W, height: bannerH });
          if (banner.buttonUrl) {
            doc.link(MARGIN, bannerY, CONTENT_W, bannerH, banner.buttonUrl);
          }
          doc.y = bannerY + bannerH + 14;
        } catch (err) {
          console.error("Banner render failed:", err);
          ensureSpace(doc, 95);
          const bannerY = doc.y;
          doc.save().roundedRect(MARGIN, bannerY, CONTENT_W, 82, 6)
            .fill(banner.gradientTo || NAVY).restore();
          doc.font("Cormorant").fontSize(20).fillColor(GOLD_LIGHT)
            .text(banner.title, MARGIN + 20, bannerY + 20, { lineBreak: false });
          doc.y = bannerY + 96;
        }
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
      doc.y = summaryY + 38;

      // ── COMBINED CHART ──
      if (data.combinedChartData.length >= 1) {
        ensureSpace(doc, 200);
        const chartData = prepareChartData(data.combinedChartData);
        const leftMax = Math.max(...data.combinedChartData.map((d) => d.netValue), 1) * 1.1;
        const rightMax = Math.max(...data.combinedChartData.map((d) => d.cumulativeDistributions), 0) * 1.1;
        const xLabels = chartData.map((d) => d.label);
        try {
          const { svg: svgStr } = renderChartSVG(chartData, 420, 140);
          const chartPng = await svgToPng(svgStr, 420, 140);
          const boxY = doc.y;
          doc.save()
            .roundedRect(MARGIN, boxY, CONTENT_W, 200, 4)
            .fill(LIGHT_BG).restore();
          doc.font("InterBold").fontSize(7).fillColor(GRAY)
            .text("PORTFOLIO PERFORMANCE", MARGIN + 12, boxY + 8, { lineBreak: false });
          const imgX = MARGIN + 52;
          const imgY = boxY + 24;
          const imgW = CONTENT_W - 116;
          const imgH = 140;
          doc.image(chartPng, imgX, imgY, { width: imgW, height: imgH });
          drawChartAxes(doc, imgX, imgY + 4, imgW, imgH - 16, leftMax, rightMax, xLabels);
          doc.y = boxY + 208;
        } catch {
          doc.y += 10;
        }
      }

      // ── DONUT CHARTS (Asset Class + Investment Allocation) ──
      if (data.allocation.length >= 1) {
        const leftRows = data.allocation.length;
        const rightRows = data.investmentAllocation.length;
        const maxRows = Math.max(leftRows, rightRows);
        const donutBoxH = Math.max(100, 24 + maxRows * 12);
        ensureSpace(doc, donutBoxH + 16);
        const donutBoxY = doc.y;
        doc.save()
          .roundedRect(MARGIN, donutBoxY, CONTENT_W, donutBoxH, 4)
          .fill(LIGHT_BG).restore();

        const halfW = CONTENT_W / 2;

        // Left donut: Asset Class Allocation
        doc.font("InterBold").fontSize(6).fillColor(GRAY)
          .text("ASSET CLASS ALLOCATION", MARGIN + 12, donutBoxY + 6, { lineBreak: false });
        try {
          const d1Svg = renderDonutSVG(data.allocation, 70);
          const d1Png = await svgToPng(d1Svg, 70, 70);
          doc.image(d1Png, MARGIN + 10, donutBoxY + 18, { width: 60, height: 60 });
        } catch { /* skip */ }

        const leg1X = MARGIN + 78;
        let leg1Y = donutBoxY + 22;
        const total1 = data.allocation.reduce((s, a) => s + a.value, 0);
        for (const a of data.allocation) {
          const pct = total1 > 0 ? Math.round((a.value / total1) * 100) : 0;
          doc.save().roundedRect(leg1X, leg1Y + 1, 5, 5, 1).fill(a.color).restore();
          doc.font("Inter").fontSize(6).fillColor(NAVY)
            .text(`${a.name} — ${formatCurrency(a.value)} (${pct}%)`, leg1X + 8, leg1Y, { lineBreak: false });
          leg1Y += 12;
        }

        // Right donut: Investment Allocation
        const rightX = MARGIN + halfW;
        doc.font("InterBold").fontSize(6).fillColor(GRAY)
          .text("INVESTMENT ALLOCATION", rightX + 12, donutBoxY + 6, { lineBreak: false });
        try {
          const d2Svg = renderDonutSVG(data.investmentAllocation, 70);
          const d2Png = await svgToPng(d2Svg, 70, 70);
          doc.image(d2Png, rightX + 10, donutBoxY + 18, { width: 60, height: 60 });
        } catch { /* skip */ }

        const leg2X = rightX + 78;
        let leg2Y = donutBoxY + 22;
        const total2 = data.investmentAllocation.reduce((s, a) => s + a.value, 0);
        for (const a of data.investmentAllocation) {
          const pct = total2 > 0 ? Math.round((a.value / total2) * 100) : 0;
          doc.save().roundedRect(leg2X, leg2Y + 1, 5, 5, 1).fill(a.color).restore();
          doc.font("Inter").fontSize(6).fillColor(NAVY)
            .text(`${a.name} ${formatCurrency(a.value)} (${pct}%)`, leg2X + 8, leg2Y, { lineBreak: false });
          leg2Y += 12;
        }

        doc.y = donutBoxY + donutBoxH + 12;
      }

      // ── INVESTMENT SECTIONS (one per page) ──
      for (const inv of data.investments) {
        startNewPage(doc);

        // Section header
        doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.y += 12;

        const invHeaderY = doc.y;
        doc.font("Cormorant").fontSize(16).fillColor(NAVY)
          .text(inv.investmentName, MARGIN, invHeaderY, { lineBreak: false });
        doc.font("Inter").fontSize(9).fillColor("#999999")
          .text(inv.assetClassName, MARGIN, invHeaderY + 20, { lineBreak: false });

        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text("AMOUNT INVESTED", PAGE_W - MARGIN - 140, invHeaderY, { width: 140, align: "right", lineBreak: false });
        doc.font("Cormorant").fontSize(16).fillColor(NAVY)
          .text(formatCurrency(inv.amountInvested), PAGE_W - MARGIN - 140, invHeaderY + 12, { width: 140, align: "right", lineBreak: false });

        doc.y = invHeaderY + 40;

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
        doc.y = metricsY + 30;

        // Per-investment donut (invested vs distributed)
        ensureSpace(doc, 80);
        const donutY = doc.y;
        try {
          const invSlices = inv.cashDistributed > 0
            ? [
                { name: "Invested", value: inv.amountInvested, color: NAVY },
                { name: "Distributions", value: inv.cashDistributed, color: GOLD },
              ]
            : [{ name: "Invested", value: inv.amountInvested, color: NAVY }];
          const invDonutSvg = renderDonutSVG(invSlices, 60);
          if (invDonutSvg) {
            const invDonutPng = await svgToPng(invDonutSvg, 60, 60);
            doc.image(invDonutPng, MARGIN, donutY, { width: 50, height: 50 });
            let ldY = donutY + 4;
            doc.save().roundedRect(MARGIN + 58, ldY + 1, 6, 6, 1).fill(NAVY).restore();
            doc.font("Inter").fontSize(7).fillColor(NAVY)
              .text(`Invested — ${formatCurrency(inv.amountInvested)}`, MARGIN + 68, ldY, { lineBreak: false });
            ldY += 14;
            doc.save().roundedRect(MARGIN + 58, ldY + 1, 6, 6, 1).fill(GOLD).restore();
            doc.font("Inter").fontSize(7).fillColor(GOLD)
              .text(`Distributions — ${formatCurrency(inv.cashDistributed)}`, MARGIN + 68, ldY, { lineBreak: false });
            ldY += 14;
            const pctDist = inv.amountInvested > 0 ? Math.round((inv.cashDistributed / inv.amountInvested) * 100) : 0;
            doc.font("Inter").fontSize(7).fillColor(GRAY)
              .text(`${pctDist}% distributed`, MARGIN + 68, ldY, { lineBreak: false });
          }
        } catch { /* skip donut */ }
        doc.y = donutY + 58;

        // Mini chart
        if (inv.chartData.length >= 1) {
          ensureSpace(doc, 150);
          try {
            const miniData = inv.chartData.map((d) => {
              const [y, m] = d.month.split("-");
              const mnths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return { month: d.month, label: `${mnths[parseInt(m, 10) - 1]} '${y.slice(2)}`, value: d.value, distributions: d.distributions };
            });
            const miniLeftMax = Math.max(...miniData.map((d) => d.value), 1) * 1.1;
            const miniRightMax = Math.max(...miniData.map((d) => d.distributions), 0) * 1.1;
            const miniXLabels = miniData.map((d) => d.label);
            const { svg: miniSvg } = renderMiniChartSVG(miniData, 380, 90);
            const miniPng = await svgToPng(miniSvg, 380, 90);
            const miniBoxY = doc.y;
            doc.save().roundedRect(MARGIN, miniBoxY, CONTENT_W, 140, 4).fill(LIGHT_BG).restore();
            const mImgX = MARGIN + 52;
            const mImgY = miniBoxY + 8;
            const mImgW = CONTENT_W - 116;
            const mImgH = 100;
            doc.image(miniPng, mImgX, mImgY, { width: mImgW, height: mImgH });
            drawChartAxes(doc, mImgX, mImgY + 4, mImgW, mImgH - 18, miniLeftMax, miniRightMax, miniXLabels);
            doc.y = miniBoxY + 146;
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

      // ── MARKET COMMENTARY & UPCOMING DISTRIBUTIONS (dedicated page) ──
      const hasCommentary = data.investments.some((inv) => inv.commentary);
      const hasUpcoming = data.investments.some((inv) => inv.upcomingDistributions.length > 0);

      if (hasCommentary || hasUpcoming) {
        startNewPage(doc);

        if (hasCommentary) {
          const periodMonth = data.periodStart.getUTCMonth();
          const periodYear = data.periodStart.getUTCFullYear();
          const quarter = Math.floor(periodMonth / 3) + 1;

          // Dramatic header — tight spacing
          const headerY = doc.y;
          doc.font("Cormorant").fontSize(16).fillColor(GRAY)
            .text("MARKET", MARGIN, headerY, { lineBreak: false, characterSpacing: 4 });
          doc.font("Cormorant").fontSize(16).fillColor(GRAY)
            .text("COMMENTARY", MARGIN, headerY + 18, { lineBreak: false, characterSpacing: 4 });
          doc.font("Cormorant").fontSize(14).fillColor(GOLD)
            .text(`Q${quarter} — ${MONTH_NAMES[periodMonth]}`, MARGIN, headerY + 42, { lineBreak: false });
          doc.font("Cormorant").fontSize(64).fillColor(NAVY)
            .text(String(periodYear), MARGIN, headerY + 56, { lineBreak: false });
          doc.y = headerY + 130;
          doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
            .strokeColor(GOLD).lineWidth(2).stroke().restore();
          doc.y += 14;

          for (const inv of data.investments) {
            if (!inv.commentary) continue;
            ensureSpace(doc, 70);

            doc.font("Cormorant").fontSize(18).fillColor(NAVY)
              .text(inv.investmentName, MARGIN, doc.y);
            doc.y += 2;
            doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + 80, doc.y)
              .strokeColor(GOLD).lineWidth(1).stroke().restore();
            doc.y += 6;

            if (inv.commentaryTitle) {
              doc.font("InterBold").fontSize(10).fillColor(GOLD)
                .text(inv.commentaryTitle, MARGIN, doc.y, { width: CONTENT_W });
              doc.moveDown(0.3);
            }

            doc.font("Inter").fontSize(9).fillColor("#333333")
              .text(inv.commentary, MARGIN, doc.y, { width: CONTENT_W, lineGap: 3 });
            doc.moveDown(1.2);
          }
        }

        if (hasUpcoming) {
          if (hasCommentary) startNewPage(doc);
          else { doc.y += 10; }
          ensureSpace(doc, 80);
          const upHeaderY = doc.y;
          doc.font("Cormorant").fontSize(16).fillColor(GRAY)
            .text("UPCOMING", MARGIN, upHeaderY, { lineBreak: false, characterSpacing: 4 });
          doc.font("Cormorant").fontSize(16).fillColor(GRAY)
            .text("DISTRIBUTIONS", MARGIN, upHeaderY + 18, { lineBreak: false, characterSpacing: 4 });
          doc.y = upHeaderY + 42;
          doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
            .strokeColor(GOLD).lineWidth(2).stroke().restore();
          doc.y += 14;

          for (const inv of data.investments) {
            if (inv.upcomingDistributions.length === 0) continue;
            ensureSpace(doc, 40);
            doc.font("Cormorant").fontSize(14).fillColor(NAVY)
              .text(inv.investmentName, MARGIN, doc.y, { lineBreak: false });
            doc.y += 18;

            // Table header
            const colW = [100, 200, CONTENT_W - 300];
            const hdrY = doc.y;
            doc.save().rect(MARGIN, hdrY, CONTENT_W, 18).fill(TABLE_HEADER_BG).restore();
            doc.font("InterBold").fontSize(7).fillColor(GRAY)
              .text("EXPECTED DATE", MARGIN + 8, hdrY + 5, { lineBreak: false });
            doc.font("InterBold").fontSize(7).fillColor(GRAY)
              .text("DESCRIPTION", MARGIN + 8 + colW[0], hdrY + 5, { lineBreak: false });
            doc.font("InterBold").fontSize(7).fillColor(GRAY)
              .text("AMOUNT", MARGIN + 8 + colW[0] + colW[1], hdrY + 5, { width: colW[2] - 8, align: "right", lineBreak: false });
            doc.y = hdrY + 20;

            for (const ud of inv.upcomingDistributions) {
              ensureSpace(doc, 18);
              const udY = doc.y;
              const dateStr = `${ud.expectedDate.getUTCMonth() + 1}/${ud.expectedDate.getUTCDate()}/${ud.expectedDate.getUTCFullYear()}`;
              doc.font("Inter").fontSize(9).fillColor(NAVY)
                .text(dateStr, MARGIN + 8, udY + 4, { lineBreak: false });
              if (ud.description) {
                doc.font("Inter").fontSize(9).fillColor("#333333")
                  .text(ud.description, MARGIN + 8 + colW[0], udY + 4, { lineBreak: false });
              }
              if (ud.amount) {
                doc.font("InterBold").fontSize(9).fillColor(NAVY)
                  .text(formatCurrency(ud.amount), MARGIN + 8 + colW[0] + colW[1], udY + 4, { width: colW[2] - 8, align: "right", lineBreak: false });
              }
              doc.y = udY + 18;
              doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_W, doc.y)
                .strokeColor("#F0EDE8").lineWidth(0.5).stroke().restore();
            }
            doc.y += 10;
          }
        }
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
          .text(footerParts.join("  |  "), MARGIN, footerY + 8, { width: CONTENT_W, align: "center", lineBreak: false });
        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text(`© ${new Date().getFullYear()} ${orgLegal}`, MARGIN, footerY + 20, { width: CONTENT_W, align: "center", lineBreak: false });
        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text(`Page ${p + 1} of ${pageCount}`, MARGIN, footerY + 32, { width: CONTENT_W, align: "center", lineBreak: false });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

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
    let existing = await prisma.statement.findUnique({
      where: { userId_periodStart: { userId, periodStart } },
    });

    if (existing && existing.deletedAt) {
      await prisma.statement.delete({ where: { id: existing.id } });
      existing = null;
    } else if (existing && existing.status !== "REJECTED") {
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

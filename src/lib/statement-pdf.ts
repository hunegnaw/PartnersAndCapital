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

// Disclosure bodies are rich text (HTML) from the editor. pdfkit can't render
// HTML, so convert to clean structured plain text: list items become bullet
// lines, block tags become paragraph breaks, remaining tags are stripped, and
// common entities are decoded. (Inline bold/italic is not styled in the PDF.)
function htmlToPlainText(html: string): string {
  if (!html) return "";
  let s = html;
  s = s.replace(/<li[^>]*>/gi, "\n•  ").replace(/<\/li>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|h[1-6]|blockquote|ul|ol|tr)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“")
    .replace(/&rdquo;/gi, "”")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
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

// A chart key/legend, centered within [boxLeft, boxLeft+contentWidth] at y.
// Line series get a short line marker; bar series get a small square (matching
// the donut legend swatches).
function drawChartLegend(
  doc: PDFKit.PDFDocument,
  boxLeft: number,
  contentWidth: number,
  y: number,
  items: { color: string; shape: "line" | "bar"; label: string }[]
) {
  doc.font("Inter").fontSize(6);
  const markerLine = 10;
  const markerBox = 6;
  const gap = 4;
  const itemGap = 16;
  const widths = items.map((it) => {
    const m = it.shape === "line" ? markerLine : markerBox;
    return m + gap + doc.widthOfString(it.label);
  });
  const total = widths.reduce((a, b) => a + b, 0) + itemGap * (items.length - 1);
  let cx = boxLeft + Math.max(0, (contentWidth - total) / 2);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.shape === "line") {
      doc.save().moveTo(cx, y + 3).lineTo(cx + markerLine, y + 3)
        .strokeColor(it.color).lineWidth(2).stroke().restore();
      doc.fillColor(GRAY).font("Inter").fontSize(6)
        .text(it.label, cx + markerLine + gap, y, { lineBreak: false });
    } else {
      doc.save().roundedRect(cx, y + 1, markerBox, markerBox, 1).fill(it.color).restore();
      doc.fillColor(GRAY).font("Inter").fontSize(6)
        .text(it.label, cx + markerBox + gap, y, { lineBreak: false });
    }
    cx += widths[i] + itemGap;
  }
}

const COMBINED_LEGEND: { color: string; shape: "line" | "bar"; label: string }[] = [
  { color: NAVY, shape: "line", label: "Portfolio Value" },
  { color: GOLD, shape: "line", label: "Cumulative Distributions" },
  { color: NAVY, shape: "bar", label: "Contributions" },
  { color: GOLD, shape: "bar", label: "Distributions" },
];

const MINI_LEGEND: { color: string; shape: "line" | "bar"; label: string }[] = [
  { color: NAVY, shape: "line", label: "Value" },
  { color: GOLD, shape: "line", label: "Cumulative Distributions" },
  { color: NAVY, shape: "bar", label: "Contributions" },
  { color: GOLD, shape: "bar", label: "Distributions" },
];

// Plain-language definitions shown at the end of every statement, before the
// disclosures. Convenience explanations only — the closing note makes that clear.
const GLOSSARY: { term: string; definition: string }[] = [
  { term: "Portfolio Value", definition: "The current estimated worth of your holdings as of the statement date." },
  { term: "Total Distributions", definition: "Cash paid out to you to date, including income and returns of capital." },
  { term: "Total Return", definition: "Combined gain from distributions plus any change in value, shown as a percentage or dollar figure." },
  { term: "ROI (Return on Investment)", definition: "Total profit relative to the amount invested, expressed as a percentage. Does not account for time held." },
  { term: "IRR (Internal Rate of Return)", definition: "Annualized return that factors in the timing of cash flows. Reflects the time value of money." },
  { term: "APR (Annual Percentage Rate)", definition: "A simple annualized rate, typically used for borrowing or flat-rate returns, without compounding or timing adjustments." },
];
const GLOSSARY_NOTE = "These definitions are simplified explanations for convenience only and do not govern your investment. Refer to your offering documents for binding terms.";

// Combined portfolio performance chart box (page 1). Shared by the since-inception
// and YTD charts so both render identically — only the title + data differ.
async function drawCombinedChartBox(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: StatementData["combinedChartData"]
) {
  ensureSpace(doc, 200);
  const chartData = prepareChartData(rows);
  const leftMax = Math.max(...rows.map((d) => d.netValue), 1) * 1.1;
  const rightMax = Math.max(...rows.map((d) => d.cumulativeDistributions), 0) * 1.1;
  const xLabels = chartData.map((d) => d.label);
  try {
    const { svg: svgStr } = renderChartSVG(chartData, 420, 140);
    const chartPng = await svgToPng(svgStr, 420, 140);
    const boxY = doc.y;
    doc.save().roundedRect(MARGIN, boxY, CONTENT_W, 200, 4).fill(LIGHT_BG).restore();
    doc.font("InterBold").fontSize(7).fillColor(GRAY)
      .text(title, MARGIN + 12, boxY + 8, { lineBreak: false });
    const imgX = MARGIN + 52;
    const imgY = boxY + 24;
    const imgW = CONTENT_W - 116;
    const imgH = 140;
    doc.image(chartPng, imgX, imgY, { width: imgW, height: imgH });
    drawChartAxes(doc, imgX, imgY + 4, imgW, imgH - 16, leftMax, rightMax, xLabels);

    // Buy-in labels above navy bars
    const barMax = Math.max(...rows.map((d) => d.monthlyContribution), 1) * 2.5;
    const chartPlotH = imgH - 16;
    const n = rows.length;
    for (let i = 0; i < n; i++) {
      const contrib = rows[i].monthlyContribution;
      if (contrib <= 0) continue;
      const x = imgX + (i / Math.max(n - 1, 1)) * imgW;
      const barH = (contrib / (barMax * 1.1)) * chartPlotH;
      const barTopY = imgY + 4 + chartPlotH - barH;
      doc.font("Inter").fontSize(5).fillColor(NAVY)
        .text(formatCurrency(contrib), x - 20, barTopY - 8, { width: 40, align: "center", lineBreak: false });
    }

    // Key / legend
    drawChartLegend(doc, MARGIN, CONTENT_W, boxY + 182, COMBINED_LEGEND);

    doc.y = boxY + 208;
  } catch {
    doc.y += 10;
  }
}

// Per-investment mini performance chart box. Shared by the since-inception and
// YTD charts. An optional title is drawn just above the box (used for YTD).
async function drawMiniChartBox(
  doc: PDFKit.PDFDocument,
  rows: StatementInvestmentData["chartData"],
  title?: string
) {
  ensureSpace(doc, title ? 162 : 150);
  try {
    const mnths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const miniData = rows.map((d) => {
      const [y, m] = d.month.split("-");
      return {
        month: d.month,
        label: `${mnths[parseInt(m, 10) - 1]} '${y.slice(2)}`,
        value: d.value,
        distributions: d.distributions,
        monthlyContribution: d.monthlyContribution,
        monthlyDistribution: d.monthlyDistribution,
      };
    });
    const miniLeftMax = Math.max(...miniData.map((d) => d.value), 1) * 1.1;
    const miniRightMax = Math.max(...miniData.map((d) => d.distributions), 0) * 1.1;
    const miniXLabels = miniData.map((d) => d.label);
    const { svg: miniSvg } = renderMiniChartSVG(miniData, 380, 90);
    const miniPng = await svgToPng(miniSvg, 380, 90);
    if (title) {
      doc.font("InterBold").fontSize(7).fillColor(GRAY)
        .text(title, MARGIN, doc.y, { lineBreak: false });
      doc.y += 12;
    }
    const miniBoxY = doc.y;
    doc.save().roundedRect(MARGIN, miniBoxY, CONTENT_W, 140, 4).fill(LIGHT_BG).restore();
    const mImgX = MARGIN + 52;
    const mImgY = miniBoxY + 8;
    const mImgW = CONTENT_W - 116;
    const mImgH = 100;
    doc.image(miniPng, mImgX, mImgY, { width: mImgW, height: mImgH });
    drawChartAxes(doc, mImgX, mImgY + 4, mImgW, mImgH - 18, miniLeftMax, miniRightMax, miniXLabels);

    // Buy-in labels above navy bars
    const mBarMax = Math.max(...miniData.map((d) => d.monthlyContribution || 0), 1) * 2.5;
    const mPlotH = mImgH - 18;
    const mN = miniData.length;
    for (let i = 0; i < mN; i++) {
      const mc = miniData[i].monthlyContribution || 0;
      if (mc <= 0) continue;
      const mx = mImgX + (i / Math.max(mN - 1, 1)) * mImgW;
      const mBarH = (mc / (mBarMax * 1.1)) * mPlotH;
      const mBarTopY = mImgY + 4 + mPlotH - mBarH;
      doc.font("Inter").fontSize(5).fillColor(NAVY)
        .text(formatCurrency(mc), mx - 20, mBarTopY - 8, { width: 40, align: "center", lineBreak: false });
    }

    // Key / legend
    drawChartLegend(doc, MARGIN, CONTENT_W, miniBoxY + 124, MINI_LEGEND);

    doc.y = miniBoxY + 146;
  } catch {
    doc.y += 4;
  }
}

// Compact strip drawn under a YTD chart: capital additions + distributions YTD.
function drawYtdSummaryStrip(doc: PDFKit.PDFDocument, contributions: number, distributions: number) {
  ensureSpace(doc, 34);
  const y = doc.y;
  const half = CONTENT_W / 2;
  doc.save().roundedRect(MARGIN, y, CONTENT_W, 28, 4).fill(LIGHT_BG).restore();
  doc.font("Inter").fontSize(6).fillColor(GRAY)
    .text("YTD CAPITAL ADDITIONS", MARGIN + 12, y + 6, { lineBreak: false, characterSpacing: 1 });
  doc.font("InterBold").fontSize(10).fillColor(NAVY)
    .text(formatCurrency(contributions), MARGIN + 12, y + 14, { lineBreak: false });
  doc.font("Inter").fontSize(6).fillColor(GRAY)
    .text("YTD DISTRIBUTIONS", MARGIN + half + 12, y + 6, { lineBreak: false, characterSpacing: 1 });
  doc.font("InterBold").fontSize(10).fillColor(GOLD)
    .text(formatCurrency(distributions), MARGIN + half + 12, y + 14, { lineBreak: false });
  doc.y = y + 34;
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
  summaries?: { label: string; amount: number; emptyNote?: string }[]
) {
  ensureSpace(doc, 60);
  const titleY = doc.y;
  doc.font("InterBold").fontSize(8).fillColor(GRAY)
    .text(title.toUpperCase(), MARGIN, titleY, { characterSpacing: 0.5, lineBreak: false });
  doc.y = titleY + 14;

  const colW = [100, 140, 120, CONTENT_W - 360];
  const headerCells: { text: string; width: number; align?: "left" | "right" }[] = [
    { text: "POSTED DATE", width: colW[0] },
    { text: "DESCRIPTION", width: colW[1] },
    { text: "PAYMENT METHOD", width: colW[2] },
    { text: "AMOUNT", width: colW[3], align: "right" },
  ];
  // Draws the column header at the current y; reused on each continuation page.
  const drawHeader = () => {
    const hY = doc.y;
    drawTableRow(doc, headerCells, hY, { bg: TABLE_HEADER_BG, bold: true, fontSize: 7 });
    doc.y = hY + 24;
  };
  drawHeader();

  if (items.length === 0) {
    doc.font("Inter").fontSize(9).fillColor("#999999")
      .text("No activity this period", MARGIN + 8, doc.y + 4, { lineBreak: false });
    doc.y += 24;
  } else {
    for (const item of items) {
      // If the next row would overflow, start a new page and repeat the header.
      if (doc.y + 24 > PAGE_H - FOOTER_H - 10) {
        startNewPage(doc);
        drawHeader();
      }
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

  // YTD summary lines — each a plain one-liner (same body font, no highlight),
  // a separate category. A note replaces the amount when it's a zero deposit.
  if (summaries && summaries.length > 0) {
    doc.y += 2;
    for (const s of summaries) {
      ensureSpace(doc, 22);
      const y = doc.y;
      const valueText = s.amount > 0
        ? formatCurrency(s.amount)
        : (s.emptyNote || formatCurrency(0));
      drawTableRow(doc, [
        { text: s.label, width: colW[0] + colW[1] + colW[2] },
        { text: valueText, width: colW[3], align: "right" },
      ], y);
      doc.y = y + 22;
    }
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
          .text("Client Service", MARGIN, 72, { lineBreak: false });
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

      let mx = MARGIN;
      for (const m of metrics) {
        doc.font("Inter").fontSize(7).fillColor("#999999")
          .text(m.label.toUpperCase(), mx, summaryY, { width: 100, lineBreak: false });
        doc.font("InterBold").fontSize(16).fillColor(m.color)
          .text(m.value, mx, summaryY + 10, { width: 100, lineBreak: false });
        mx += 105;
      }
      doc.y = summaryY + 38;

      // ── COMBINED CHART (since inception) ──
      if (data.combinedChartData.length >= 1) {
        await drawCombinedChartBox(doc, "PORTFOLIO PERFORMANCE", data.combinedChartData);
      }

      // ── COMBINED CHART (year to date) ──
      if (data.combinedChartDataYTD.length >= 1) {
        await drawCombinedChartBox(doc, "YTD PERFORMANCE", data.combinedChartDataYTD);
        drawYtdSummaryStrip(doc, data.ytdContributions, data.ytdDistributions);
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

        // Mini chart (since inception)
        if (inv.chartData.length >= 1) {
          await drawMiniChartBox(doc, inv.chartData);
        }

        // Mini chart (year to date)
        if (inv.chartDataYTD.length >= 1) {
          await drawMiniChartBox(doc, inv.chartDataYTD, "YTD PERFORMANCE");
          drawYtdSummaryStrip(doc, inv.totalDepositsYTD, inv.totalDistributionsYTD);
        }

        // Activity tables
        drawActivityTable(doc, "Current Month Distributions & Credits", inv.recentActivity);
        drawActivityTable(
          doc,
          "Previous Distributions & Activity",
          inv.previousActivity,
          [
            { label: "Total Deposits YTD", amount: inv.totalDepositsYTD, emptyNote: "No deposits this year" },
            { label: "Total Distributions YTD", amount: inv.totalDistributionsYTD },
          ]
        );

        doc.y += 8;
      }

      // ── MARKET COMMENTARY & UPCOMING DISTRIBUTIONS (dedicated page) ──
      const hasGeneral = !!data.generalCommentary;
      const hasInvCommentary = data.investments.some((inv) => inv.commentary);
      const hasCommentary = hasGeneral || hasInvCommentary;
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

          // Firm-wide "note to all partners" — rendered first, above the
          // per-investment commentary.
          if (data.generalCommentary) {
            ensureSpace(doc, 70);
            doc.font("Cormorant").fontSize(18).fillColor(NAVY)
              .text(data.generalCommentary.title || "A Note to Our Partners", MARGIN, doc.y, { width: CONTENT_W });
            doc.y += 2;
            doc.save().moveTo(MARGIN, doc.y).lineTo(MARGIN + 80, doc.y)
              .strokeColor(GOLD).lineWidth(1).stroke().restore();
            doc.y += 6;

            doc.font("Inter").fontSize(9).fillColor("#333333")
              .text(data.generalCommentary.body, MARGIN, doc.y, { width: CONTENT_W, lineGap: 3 });
            doc.moveDown(1.2);
          }

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

      // ── GLOSSARY OF INVESTMENT TERMS (end matter, before disclosures) ──
      startNewPage(doc);
      doc.font("Cormorant").fontSize(18).fillColor(NAVY)
        .text("Glossary of Investment Terms", MARGIN, doc.y);
      doc.y += 4;
      doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
        .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
      doc.y += 10;
      for (const g of GLOSSARY) {
        ensureSpace(doc, 34);
        doc.font("InterBold").fontSize(9).fillColor("#333333")
          .text(`${g.term}: `, MARGIN, doc.y, { width: CONTENT_W, continued: true });
        doc.font("Inter").fontSize(9).fillColor(GRAY)
          .text(g.definition, { lineGap: 1 });
        doc.moveDown(0.5);
      }
      ensureSpace(doc, 30);
      doc.moveDown(0.2);
      doc.font("Inter").fontSize(8).fillColor("#999999")
        .text(GLOSSARY_NOTE, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });

      // ── DISCLOSURES (after the glossary) ──
      if (data.disclosures.length > 0) {
        ensureSpace(doc, 80);
        doc.moveDown(1);
        doc.font("Cormorant").fontSize(18).fillColor(NAVY)
          .text("Disclosures", MARGIN, doc.y);
        doc.y += 4;
        doc.save().moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
          .strokeColor(GOLD).lineWidth(1.5).stroke().restore();
        doc.y += 10;

        for (const d of data.disclosures) {
          // The title is an internal label only — not rendered. Body is rich text.
          const text = htmlToPlainText(d.body);
          if (!text) continue;
          ensureSpace(doc, 40);
          doc.font("Inter").fontSize(8).fillColor(GRAY)
            .text(text, MARGIN, doc.y, { width: CONTENT_W, lineGap: 2 });
          doc.moveDown(0.6);
        }
      }

      // ── FOOTER ON EVERY PAGE ──
      const orgLegal = data.org.legalName || data.org.name;
      const footerParts = [orgLegal, data.org.email, data.org.address].filter(Boolean);
      const pageCount = doc.bufferedPageRange().count;
      // Generation timestamp (Eastern Time), stamped once at render and baked into
      // the stored PDF — shown next to the page number.
      const genNow = new Date();
      const genDate = new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "2-digit", timeZone: "America/New_York" }).format(genNow);
      const genTime = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/New_York" }).format(genNow);
      const generatedStamp = `Statement generated on ${genDate} at ${genTime} ET`;
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
          .text(`Page ${p + 1} of ${pageCount}  |  ${generatedStamp}`, MARGIN, footerY + 32, { width: CONTENT_W, align: "center", lineBreak: false });
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

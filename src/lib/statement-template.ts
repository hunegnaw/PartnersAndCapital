import { type StatementData, type StatementInvestmentData } from "./statement-generator";
import { renderChartSVG, renderMiniChartSVG, prepareChartData } from "./statement-chart";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatPct(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

function renderBanner(banner: StatementData["banners"][0]): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const imageUrl = banner.imageUrl
    ? banner.imageUrl.startsWith("/")
      ? `${baseUrl}${banner.imageUrl}`
      : banner.imageUrl
    : null;

  const buttonHtml = banner.buttonText && banner.buttonUrl
    ? `<a href="${banner.buttonUrl}" style="display:inline-block;padding:8px 20px;background:#B07D3A;color:#fff;text-decoration:none;border-radius:4px;font-size:12px;font-weight:600;margin-top:8px;">${banner.buttonText}</a>`
    : "";

  return `
    <div style="position:relative;margin:16px 0;border-radius:6px;overflow:hidden;height:120px;background:linear-gradient(to right, ${banner.gradientFrom}, ${banner.gradientTo});">
      ${imageUrl ? `<img src="${imageUrl}" style="position:absolute;left:0;top:0;width:200px;height:120px;object-fit:cover;" />` : ""}
      <div style="position:absolute;left:${imageUrl ? "120px" : "0"};top:0;right:0;bottom:0;background:linear-gradient(to right, transparent, ${banner.gradientTo} ${imageUrl ? "40%" : "0%"});display:flex;flex-direction:column;justify-content:center;padding:16px 24px;${imageUrl ? "padding-left:100px;" : ""}">
        <div style="color:#E8D5B0;font-size:16px;font-weight:600;margin-bottom:4px;">${banner.title}</div>
        ${banner.description ? `<div style="color:#ffffff;font-size:11px;opacity:0.85;margin-bottom:6px;line-height:1.4;">${banner.description}</div>` : ""}
        ${buttonHtml}
      </div>
    </div>`;
}

function renderActivityTable(
  title: string,
  items: StatementInvestmentData["recentActivity"],
  showTotal: boolean = false,
  totalLabel?: string,
  totalAmount?: number
): string {
  if (items.length === 0 && !showTotal) return "";

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 16px;font-size:12px;color:#333;border-bottom:1px solid #f0ede8;">${formatDate(item.date)}</td>
        <td style="padding:10px 16px;font-size:12px;color:#333;border-bottom:1px solid #f0ede8;">${item.description}</td>
        <td style="padding:10px 16px;font-size:12px;color:#333;border-bottom:1px solid #f0ede8;">${item.paymentMethod}</td>
        <td style="padding:10px 16px;font-size:12px;color:#333;border-bottom:1px solid #f0ede8;text-align:right;">${formatCurrency(item.amount)}</td>
      </tr>`
    )
    .join("");

  const totalRow =
    showTotal && totalLabel
      ? `<tr style="background:#faf8f5;">
          <td colspan="3" style="padding:10px 16px;font-size:12px;font-weight:700;color:#333;">${totalLabel}</td>
          <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#333;text-align:right;">${formatCurrency(totalAmount || 0)}</td>
        </tr>`
      : "";

  return `
    <div style="margin:20px 0 8px 0;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:8px;">${title}</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f5f3ee;">
            <th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#666;text-align:left;">Posted Date</th>
            <th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#666;text-align:left;">Description</th>
            <th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#666;text-align:left;">Payment Method</th>
            <th style="padding:8px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#666;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0 ? `<tr><td colspan="4" style="padding:16px;text-align:center;color:#999;font-size:12px;">No activity this period</td></tr>` : rows}
          ${totalRow}
        </tbody>
      </table>
    </div>`;
}

function renderInvestmentSection(inv: StatementInvestmentData): string {
  const miniChartData = inv.chartData.map((d) => {
    const [y, m] = d.month.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      month: d.month,
      label: `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`,
      value: d.value,
      distributions: d.distributions,
    };
  });

  let miniChart = "";
  try {
    miniChart = renderMiniChartSVG(miniChartData);
  } catch {
    miniChart = '<div style="height:140px;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px;">Chart unavailable</div>';
  }

  const metricsHtml = `
    <div style="display:flex;gap:24px;margin:12px 0;flex-wrap:wrap;">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Amount Invested</div>
        <div style="font-size:16px;font-weight:600;color:#1A2640;">${formatCurrency(inv.amountInvested)}</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Current Value</div>
        <div style="font-size:16px;font-weight:600;color:#1A2640;">${formatCurrency(inv.currentValue)}</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Cash Distributed</div>
        <div style="font-size:16px;font-weight:600;color:#B07D3A;">${formatCurrency(inv.cashDistributed)}</div>
      </div>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">ROI</div>
        <div style="font-size:16px;font-weight:600;color:#1A2640;">${formatPct(inv.returnPercentage)}</div>
      </div>
      ${inv.irr != null ? `<div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">IRR</div>
        <div style="font-size:16px;font-weight:600;color:#1A2640;">${formatPct(inv.irr)}</div>
      </div>` : ""}
      ${inv.apr != null ? `<div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">APR</div>
        <div style="font-size:16px;font-weight:600;color:#1A2640;">${formatPct(inv.apr)}</div>
      </div>` : ""}
    </div>`;

  return `
    <div style="page-break-inside:avoid;margin:24px 0;border-top:2px solid #B07D3A;padding-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div>
          <div style="font-size:18px;font-weight:700;color:#1A2640;">${inv.investmentName}</div>
          <div style="font-size:11px;color:#999;margin-top:2px;">${inv.assetClassName}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Amount Invested</div>
          <div style="font-size:20px;font-weight:700;color:#1A2640;">${formatCurrency(inv.amountInvested)}</div>
        </div>
      </div>
      ${metricsHtml}
      <div style="margin:16px 0;background:#faf8f5;border-radius:6px;padding:12px;overflow:hidden;">
        ${miniChart}
      </div>
      ${renderActivityTable("Recent Payments & Credits", inv.recentActivity)}
      ${renderActivityTable(
        "Previous Payments & Activity",
        inv.previousActivity,
        true,
        "Total Deposits YTD",
        inv.totalDepositsYTD + inv.totalDistributionsYTD
      )}
    </div>`;
}

export function buildStatementHTML(data: StatementData): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const logoUrl = data.org.logoUrl
    ? data.org.logoUrl.startsWith("/")
      ? `${baseUrl}${data.org.logoUrl}`
      : data.org.logoUrl
    : null;

  const chartData = prepareChartData(data.combinedChartData);
  let combinedChart = "";
  try {
    combinedChart = renderChartSVG(chartData);
  } catch {
    combinedChart = '<div style="height:200px;display:flex;align-items:center;justify-content:center;color:#999;">Chart unavailable</div>';
  }

  const bannersHtml = data.banners.map(renderBanner).join("");
  const investmentsHtml = data.investments.map(renderInvestmentSection).join("");
  const disclosuresHtml = data.disclosures
    .map(
      (d) => `
      <div style="margin-bottom:14px;">
        <div style="font-size:12px;font-weight:700;color:#333;margin-bottom:4px;">${d.title}</div>
        <div style="font-size:11px;color:#666;line-height:1.5;">${d.body}</div>
      </div>`
    )
    .join("");

  const orgLegal = data.org.legalName || data.org.name;
  const footerParts = [orgLegal, data.org.email, data.org.address].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; background: #fff; }
    @page { size: letter; margin: 0; }
  </style>
</head>
<body>
  <div style="max-width:612px;margin:0 auto;padding:0;">

    <!-- HEADER -->
    <div style="background:#1A2640;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        ${logoUrl
          ? `<img src="${logoUrl}" alt="${data.org.name}" style="max-height:36px;width:auto;" />`
          : `<div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:#E8D5B0;letter-spacing:0.06em;">PARTNERS <span style="color:#ffffff;">+ CAPITAL</span></div>`
        }
        <div style="font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#ffffff;opacity:0.5;margin-top:4px;">Public Access to Private Markets</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;opacity:0.6;">Statement</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:500;color:#ffffff;">${data.statementDate}</div>
      </div>
    </div>

    <!-- GOLD LINE -->
    <div style="height:3px;background:linear-gradient(to right,#B07D3A,#E8D5B0);"></div>

    <!-- CLIENT INFO -->
    <div style="padding:24px 40px;display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #B07D3A;">
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#999;">Client</div>
        <div style="font-size:28px;font-weight:700;color:#1A2640;line-height:1.2;">${data.clientName}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#999;">Total Amount Invested</div>
        <div style="font-size:28px;font-weight:700;color:#1A2640;">${formatCurrency(data.totalInvested)}</div>
      </div>
    </div>

    <!-- BANNERS -->
    ${bannersHtml ? `<div style="padding:0 40px;">${bannersHtml}</div>` : ""}

    <!-- PORTFOLIO SUMMARY -->
    <div style="padding:24px 40px 0;">
      <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Portfolio Value</div>
          <div style="font-size:22px;font-weight:700;color:#1A2640;">${formatCurrency(data.currentValue)}</div>
        </div>
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Total Distributions</div>
          <div style="font-size:22px;font-weight:700;color:#B07D3A;">${formatCurrency(data.totalDistributions)}</div>
        </div>
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Total Return</div>
          <div style="font-size:22px;font-weight:700;color:#1A2640;">${formatPct(data.totalReturnPct)}</div>
        </div>
        ${data.weightedIrr ? `<div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Net IRR</div>
          <div style="font-size:22px;font-weight:700;color:#1A2640;">${formatPct(data.weightedIrr)}</div>
        </div>` : ""}
        ${data.weightedApr ? `<div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:#999;">Net APR</div>
          <div style="font-size:22px;font-weight:700;color:#1A2640;">${formatPct(data.weightedApr)}</div>
        </div>` : ""}
      </div>

      <!-- COMBINED CHART -->
      ${data.combinedChartData.length > 1 ? `
      <div style="background:#faf8f5;border-radius:6px;padding:16px;margin-bottom:8px;overflow:hidden;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin-bottom:8px;">Portfolio Performance</div>
        <div style="display:flex;gap:16px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:12px;height:2px;background:#1A2640;"></div><span style="font-size:9px;color:#666;">Portfolio Value</span></div>
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:12px;height:2px;background:#B07D3A;"></div><span style="font-size:9px;color:#666;">Cumulative Distributions</span></div>
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;background:#1A2640;opacity:0.7;"></div><span style="font-size:9px;color:#666;">Contributions</span></div>
          <div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;background:#B07D3A;opacity:0.7;"></div><span style="font-size:9px;color:#666;">Distributions</span></div>
        </div>
        ${combinedChart}
      </div>` : ""}
    </div>

    <!-- INVESTMENT SECTIONS -->
    <div style="padding:0 40px;">
      ${investmentsHtml}
    </div>

    <!-- DISCLOSURES -->
    ${disclosuresHtml ? `
    <div style="padding:32px 40px;margin-top:24px;">
      <div style="font-size:22px;font-weight:700;color:#1A2640;margin-bottom:4px;">Disclosures</div>
      <div style="height:2px;background:#B07D3A;margin-bottom:20px;"></div>
      ${disclosuresHtml}
    </div>` : ""}

    <!-- FOOTER -->
    <div style="padding:20px 40px;border-top:1px solid #e8e5e0;margin-top:20px;">
      <div style="font-size:10px;color:#999;margin-bottom:8px;">&copy; ${new Date().getFullYear()} ${orgLegal}</div>
      <div style="height:1px;background:#e8e5e0;margin:12px 0;"></div>
      <div style="text-align:center;font-size:9px;color:#999;letter-spacing:0.02em;">
        ${footerParts.join(" | ")}
      </div>
    </div>

  </div>
</body>
</html>`;
}

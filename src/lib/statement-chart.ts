interface ChartDataPoint {
  month: string;
  label: string;
  netValue: number;
  cumulativeDistributions: number;
  monthlyDistribution: number;
  monthlyContribution: number;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(0)}K`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value === 0) return "$0";
  return `$${value.toFixed(0)}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSvgChart(
  data: { label: string; values: { key: string; value: number; color: string }[] }[],
  width: number,
  height: number,
  options: {
    lineKeys?: { key: string; color: string; yAxis?: "left" | "right" }[];
    barKeys?: { key: string; color: string }[];
    barWidth?: number;
  } = {}
): string {
  const margin = { top: 10, right: 60, bottom: 30, left: 55 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const lineKeys = options.lineKeys || [];
  const barKeys = options.barKeys || [];
  const barWidth = options.barWidth || 6;

  const allLineVals = data.flatMap((d) =>
    d.values.filter((v) => lineKeys.some((lk) => lk.key === v.key)).map((v) => v.value)
  );
  const allBarVals = data.flatMap((d) =>
    d.values.filter((v) => barKeys.some((bk) => bk.key === v.key)).map((v) => v.value)
  );

  const lineMax = allLineVals.length > 0 ? Math.max(...allLineVals, 1) : 1;
  const barMax = allBarVals.length > 0 ? Math.max(...allBarVals, 1) * 2.5 : 1;

  const rightAxisKeys = lineKeys.filter((lk) => lk.yAxis === "right").map((lk) => lk.key);
  const leftAxisKeys = lineKeys.filter((lk) => lk.yAxis !== "right").map((lk) => lk.key);

  const leftVals = data.flatMap((d) =>
    d.values.filter((v) => leftAxisKeys.includes(v.key)).map((v) => v.value)
  );
  const rightVals = data.flatMap((d) =>
    d.values.filter((v) => rightAxisKeys.includes(v.key)).map((v) => v.value)
  );
  const leftMax = leftVals.length > 0 ? Math.max(...leftVals, 1) : lineMax;
  const rightMax = rightVals.length > 0 ? Math.max(...rightVals, 1) : lineMax;

  function xPos(i: number): number {
    return margin.left + (i / Math.max(data.length - 1, 1)) * chartW;
  }

  function yPosLeft(val: number): number {
    return margin.top + chartH - (val / (leftMax * 1.1)) * chartH;
  }

  function yPosRight(val: number): number {
    return margin.top + chartH - (val / (rightMax * 1.1)) * chartH;
  }



  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  // Grid lines
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const y = margin.top + (i / gridSteps) * chartH;
    svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartW}" y2="${y}" stroke="#E8EBF0" stroke-dasharray="3,3" />`;
  }

  // Y-axis labels (left)
  for (let i = 0; i <= gridSteps; i++) {
    const val = leftMax * 1.1 * (1 - i / gridSteps);
    const y = margin.top + (i / gridSteps) * chartH;
    svg += `<text x="${margin.left - 5}" y="${y + 4}" text-anchor="end" font-size="11" fill="#666" font-family="sans-serif">${escapeXml(formatCompact(val))}</text>`;
  }

  // Y-axis labels (right)
  if (rightAxisKeys.length > 0) {
    for (let i = 0; i <= gridSteps; i++) {
      const val = rightMax * 1.1 * (1 - i / gridSteps);
      const y = margin.top + (i / gridSteps) * chartH;
      svg += `<text x="${margin.left + chartW + 5}" y="${y + 4}" text-anchor="start" font-size="11" fill="#B07D3A" font-family="sans-serif">${escapeXml(formatCompact(val))}</text>`;
    }
  }

  // X-axis labels
  const labelInterval = Math.max(1, Math.floor(data.length / 8));
  for (let i = 0; i < data.length; i += labelInterval) {
    const x = xPos(i);
    svg += `<text x="${x}" y="${height - 5}" text-anchor="middle" font-size="10" fill="#666" font-family="sans-serif">${escapeXml(data[i].label)}</text>`;
  }

  // Bars
  for (let bi = 0; bi < barKeys.length; bi++) {
    const bk = barKeys[bi];
    for (let i = 0; i < data.length; i++) {
      const val = data[i].values.find((v) => v.key === bk.key)?.value || 0;
      if (val <= 0) continue;
      const x = xPos(i) - barWidth + bi * barWidth;
      const barH = (val / (barMax * 1.1)) * chartH;
      const y = margin.top + chartH - barH;
      svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${bk.color}" opacity="0.7" rx="1" />`;
    }
  }

  // Lines (smooth cubic bezier curves)
  for (const lk of lineKeys) {
    const pts: { x: number; y: number }[] = [];
    const yFn = lk.yAxis === "right" ? yPosRight : yPosLeft;
    for (let i = 0; i < data.length; i++) {
      const val = data[i].values.find((v) => v.key === lk.key)?.value || 0;
      pts.push({ x: xPos(i), y: yFn(val) });
    }
    if (pts.length === 1) {
      svg += `<circle cx="${pts[0].x}" cy="${pts[0].y}" r="3" fill="${lk.color}" />`;
    } else if (pts.length > 1) {
      let d = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const tension = 0.3;
        const dx = curr.x - prev.x;
        const cp1x = prev.x + dx * tension;
        const cp2x = curr.x - dx * tension;
        d += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
      }
      svg += `<path d="${d}" fill="none" stroke="${lk.color}" stroke-width="2" stroke-linecap="round" />`;
    }
  }

  svg += "</svg>";
  return svg;
}

export function renderChartSVG(
  data: ChartDataPoint[],
  width: number = 540,
  height: number = 200
): string {
  const chartData = data.map((d) => ({
    label: d.label,
    values: [
      { key: "netValue", value: d.netValue, color: "#1A2640" },
      { key: "cumDist", value: d.cumulativeDistributions, color: "#B07D3A" },
      { key: "monthContrib", value: d.monthlyContribution, color: "#1A2640" },
      { key: "monthDist", value: d.monthlyDistribution, color: "#B07D3A" },
    ],
  }));

  return buildSvgChart(chartData, width, height, {
    lineKeys: [
      { key: "netValue", color: "#1A2640", yAxis: "left" },
      { key: "cumDist", color: "#B07D3A", yAxis: "right" },
    ],
    barKeys: [
      { key: "monthContrib", color: "#1A2640" },
      { key: "monthDist", color: "#B07D3A" },
    ],
    barWidth: 5,
  });
}

export function renderMiniChartSVG(
  data: { month: string; label: string; value: number; distributions: number }[],
  width: number = 540,
  height: number = 140
): string {
  const chartData = data.map((d) => ({
    label: d.label,
    values: [
      { key: "value", value: d.value, color: "#1A2640" },
      { key: "distributions", value: d.distributions, color: "#B07D3A" },
    ],
  }));

  return buildSvgChart(chartData, width, height, {
    lineKeys: [
      { key: "value", color: "#1A2640", yAxis: "left" },
      { key: "distributions", color: "#B07D3A", yAxis: "right" },
    ],
  });
}

export function prepareChartData(
  monthlyData: {
    month: string;
    netValue: number;
    cumulativeDistributions: number;
    monthlyDistribution: number;
    monthlyContribution: number;
  }[]
): ChartDataPoint[] {
  return monthlyData.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));
}

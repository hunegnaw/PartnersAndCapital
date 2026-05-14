"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  LineChart,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatCurrency, formatDate, formatDateOnly, formatMonthYear, formatShortDate, cn } from "@/lib/utils";

interface InvestmentDetail {
  id: string;
  amountInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  irr: number | null;
  returnMultiple: number | null;
  cashDistributed: number;
  status: string;
  investmentDate: string;
  investment: {
    name: string;
    description: string;
    assetClass: { name: string };
    status: string;
    location: string | null;
    targetHoldPeriod: string | null;
    distributionCadence: string | null;
    fundStatus: string | null;
    targetReturn: string | null;
    vintage: string | null;
    dealRoomUpdates: {
      id: string;
      title: string;
      content: string;
      createdAt: string;
    }[];
    documents: {
      id: string;
      name: string;
      type: string;
      year: string | null;
      mimeType: string | null;
      fileSize: number | null;
      createdAt: string;
    }[];
  };
  contributions: {
    id: string;
    amount: number;
    date: string;
    description: string | null;
    status: string;
  }[];
  distributions: {
    id: string;
    amount: number;
    date: string;
    type: string;
    description: string | null;
    status: string;
  }[];
}

function DetailSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-4 w-48" />
      <div className="bg-[#1A2640] rounded-2xl p-8">
        <Skeleton className="h-8 w-64 bg-white/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#dfdedd] p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Generate growth data from contributions/distributions
function generateGrowthData(
  contributions: { amount: number; date: string }[],
  _distributions: { amount: number; date: string }[],
  currentValue: number
) {
  // Build value curve from contributions only (distributions don't reduce position value)
  const sorted = [...contributions]
    .map((c) => ({ date: c.date, amount: Number(c.amount) }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) return [];

  const points: { date: string; value: number }[] = [];
  let cumulative = 0;

  for (const item of sorted) {
    cumulative += item.amount;
    points.push({
      date: formatShortDate(item.date),
      value: cumulative,
    });
  }

  // Add current value as final point (reflects actual valuation)
  points.push({
    date: "Now",
    value: currentValue,
  });

  return points;
}

// Generate capital activity chart data: monthly distributions (bars) + cumulative lines
function generateDistributionChartData(
  contributions: { amount: number; date: string }[],
  distributions: { amount: number; date: string }[]
) {
  const months = new Map<
    string,
    { monthlyDistribution: number; contributions: number }
  >();

  for (const c of contributions) {
    const key = c.date.slice(0, 7); // YYYY-MM
    const entry = months.get(key) || { monthlyDistribution: 0, contributions: 0 };
    entry.contributions += Number(c.amount);
    months.set(key, entry);
  }

  for (const d of distributions) {
    const key = d.date.slice(0, 7);
    const entry = months.get(key) || { monthlyDistribution: 0, contributions: 0 };
    entry.monthlyDistribution += Number(d.amount);
    months.set(key, entry);
  }

  const sorted = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length < 2) return [];

  let cumulativeDeployed = 0;
  let cumulativeDistributions = 0;

  return sorted.map(([month, data]) => {
    cumulativeDeployed += data.contributions;
    cumulativeDistributions += data.monthlyDistribution;

    // Format month label
    const [y, m] = month.split("-");
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });

    return {
      month: label,
      monthlyDistribution: data.monthlyDistribution,
      cumulativeDeployed,
      cumulativeDistributions,
    };
  });
}

export default function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<InvestmentDetail | null>(null);
  const [valuationData, setValuationData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/investments/${id}`);
      if (!res.ok) throw new Error("Failed to load investment details");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchValuations = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/investments/${id}/valuations`);
      if (!res.ok) return;
      const json = await res.json();
      setValuationData(json);
    } catch {
      // Non-critical
    }
  }, [id]);

  const holdingMonths = (() => {
    if (!data?.investmentDate) return null;
    const investDate = new Date(data.investmentDate);
    return Math.round(
      (new Date().getTime() - investDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
  })();

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDetail();
      fetchValuations();
    });
  }, [fetchDetail, fetchValuations]);

  if (loading) return <DetailSkeleton />;

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
          <p className="text-red-600">{error || "Investment not found"}</p>
        </div>
      </div>
    );
  }

  const gain = data.currentValue - data.amountInvested;
  const distributionCount = data.distributions.length;
  const targetHoldMonths = data.investment.targetHoldPeriod
    ? parseInt(data.investment.targetHoldPeriod) * 12
    : null;

  // Use real valuation data if available (2+ points), otherwise fall back to contribution-based
  const realValuationChart = valuationData.length >= 2
    ? valuationData.map((v) => ({
        date: formatShortDate(v.date),
        value: v.value,
      }))
    : null;

  const growthData = realValuationChart || generateGrowthData(
    data.contributions,
    data.distributions,
    data.currentValue
  );

  // Capital activity chart data
  const capitalActivityData = generateDistributionChartData(
    data.contributions,
    data.distributions
  );

  // Group updates by month/year
  const updatesByDate: Record<string, typeof data.investment.dealRoomUpdates> = {};
  for (const update of data.investment.dealRoomUpdates) {
    const key = formatMonthYear(update.createdAt);
    if (!updatesByDate[key]) updatesByDate[key] = [];
    updatesByDate[key].push(update);
  }

  const overviewRows = [
    { label: "Asset class", value: data.investment.assetClass?.name },
    { label: "Location", value: data.investment.location },
    {
      label: "Investment date",
      value: data.investmentDate ? formatDateOnly(data.investmentDate) : null,
    },
    { label: "Target hold", value: data.investment.targetHoldPeriod },
    {
      label: "Target return",
      value: data.investment.targetReturn
        ? `${data.investment.targetReturn}%`
        : null,
    },
    {
      label: "Distribution cadence",
      value: data.investment.distributionCadence,
    },
    { label: "Fund status", value: data.investment.fundStatus },
  ].filter((row) => row.value);

  return (
    <div className="p-8 space-y-6">
      {/* Navy header section */}
      <div className="bg-[#1A2640] rounded-2xl p-8">
        <nav className="flex items-center gap-1 text-sm text-white/40 mb-4">
          <Link
            href="/investments"
            className="hover:text-white/70 transition-colors"
          >
            Portfolio
          </Link>
          <span>/</span>
          <span className="text-white/70">{data.investment.name}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {data.investment.name}
            </h1>
            <p className="text-white/50 text-sm">
              {data.investment.assetClass?.name}
              {data.investment.location && ` \u00b7 ${data.investment.location}`}
            </p>
          </div>
          <Badge
            className={cn(
              "text-xs font-medium border",
              data.status === "ACTIVE"
                ? "border-[#3b6d11]/30 text-[#3b6d11] bg-[#eaf3de]"
                : "border-white/20 text-white/60 bg-white/5"
            )}
          >
            {data.status === "ACTIVE" ? "Active" : data.status}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-white border border-[#dfdedd]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="disclosures">Disclosures</TabsTrigger>
        </TabsList>

        {/* 5 KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mt-6">
          <div className="bg-white rounded-xl border border-[#dfdedd] p-4">
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-1">
              Invested
            </p>
            <p className="text-xl font-bold text-[#1a1a18]">
              {formatCurrency(data.amountInvested)}
            </p>
            <p className="text-xs text-[#888780] mt-0.5">
              {data.investmentDate ? formatDateOnly(data.investmentDate) : ""}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#dfdedd] p-4">
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-1">
              Current Value
            </p>
            <p className="text-xl font-bold text-[#1a1a18]">
              {formatCurrency(data.currentValue)}
            </p>
            <p
              className={cn(
                "text-xs mt-0.5",
                gain >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {gain >= 0 ? "+" : ""}
              {formatCurrency(gain)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#dfdedd] p-4">
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-1">
              Total Return
            </p>
            <p
              className={cn(
                "text-xl font-bold",
                data.returnPercentage >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              +{Number(data.returnPercentage).toFixed(1)}%
            </p>
            <p className="text-xs text-[#888780] mt-0.5">
              Net IRR: {data.irr != null ? `${Number(data.irr).toFixed(1)}%` : "N/A"}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#dfdedd] p-4">
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-1">
              Cash Distributed
            </p>
            <p className="text-xl font-bold text-[#1a1a18]">
              {formatCurrency(data.cashDistributed)}
            </p>
            <p className="text-xs text-[#888780] mt-0.5">
              {distributionCount} payment{distributionCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#dfdedd] p-4">
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-1">
              Holding Period
            </p>
            <p className="text-xl font-bold text-[#1a1a18]">
              {holdingMonths != null ? `${holdingMonths} mo.` : "N/A"}
            </p>
            <p className="text-xs text-[#888780] mt-0.5">
              {targetHoldMonths
                ? `Target ${targetHoldMonths} mo.`
                : data.investment.targetHoldPeriod || ""}
            </p>
          </div>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: Overview details */}
            <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
              <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-4">
                Overview
              </h3>
              {data.investment.description && (
                <p className="text-sm text-[#5f5e5a] mb-4 leading-relaxed">
                  {data.investment.description}
                </p>
              )}
              <div className="divide-y divide-[#eeece8]">
                {overviewRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2.5"
                  >
                    <span className="text-sm text-[#5f5e5a]">{row.label}</span>
                    <span className="text-sm font-medium text-[#1a1a18]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Chart + Latest Update */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
                <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-4">
                  Value Over Time
                </h3>
                {growthData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfdedd" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#888780" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#888780" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`}
                        width={60}
                      />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(Number(value ?? 0)),
                          "Value",
                        ]}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #dfdedd",
                          borderRadius: "8px",
                          fontSize: "13px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#B07D3A"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#B07D3A" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-[#888780]">
                    Not enough data for chart
                  </div>
                )}
              </div>

              {/* Capital Activity Chart */}
              {capitalActivityData.length >= 2 && (
                <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
                  <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-4">
                    Capital Activity
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={capitalActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfdedd" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#888780" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#888780" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) =>
                          val >= 1_000_000
                            ? `$${(val / 1_000_000).toFixed(1)}M`
                            : `$${(val / 1_000).toFixed(0)}K`
                        }
                        width={65}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatCurrency(Number(value ?? 0)),
                          name === "monthlyDistribution"
                            ? "Monthly Distribution"
                            : name === "cumulativeDeployed"
                              ? "Cumulative Deployed"
                              : "Cumulative Distributions",
                        ]}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #dfdedd",
                          borderRadius: "8px",
                          fontSize: "13px",
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value: string) =>
                          value === "monthlyDistribution"
                            ? "Monthly Distribution"
                            : value === "cumulativeDeployed"
                              ? "Cumulative Deployed"
                              : "Cumulative Distributions"
                        }
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                      <Bar
                        dataKey="monthlyDistribution"
                        fill="#B07D3A"
                        radius={[3, 3, 0, 0]}
                        barSize={20}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulativeDeployed"
                        stroke="#1A2640"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulativeDistributions"
                        stroke="#3b6d11"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Latest Update */}
              {data.investment.dealRoomUpdates.length > 0 && (
                <div className="bg-[#f5f5f3] rounded-xl border border-[#dfdedd] p-6">
                  <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-3">
                    Latest Update
                  </h3>
                  <h4 className="text-sm font-semibold text-[#1a1a18] mb-1">
                    {data.investment.dealRoomUpdates[0].title}
                  </h4>
                  <p className="text-sm text-[#5f5e5a] leading-relaxed line-clamp-4">
                    {data.investment.dealRoomUpdates[0].content}
                  </p>
                  <p className="text-xs text-[#888780] mt-2">
                    {formatDate(data.investment.dealRoomUpdates[0].createdAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="mt-6">
          {data.investment.dealRoomUpdates.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(updatesByDate).map(([dateGroup, updates]) => (
                <div key={dateGroup}>
                  <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-3">
                    {dateGroup}
                  </h3>
                  <div className="space-y-4">
                    {updates.map((update) => (
                      <div
                        key={update.id}
                        className="bg-white rounded-xl border border-[#dfdedd] p-5"
                      >
                        <h4 className="text-sm font-semibold text-[#1a1a18] mb-2">
                          {update.title}
                        </h4>
                        <p className="text-sm text-[#5f5e5a] whitespace-pre-wrap leading-relaxed">
                          {update.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#dfdedd] p-6 text-center py-12">
              <p className="text-sm text-[#888780]">
                No updates available for this investment
              </p>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          {data.investment.documents.length > 0 ? (
            <div className="bg-white rounded-xl border border-[#dfdedd] divide-y divide-[#eeece8]">
              {data.investment.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1a1a18]">
                      {doc.name}
                    </p>
                    <p className="text-xs text-[#888780]">
                      {doc.type.replace(/_/g, " ")} &middot;{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                  <a
                    href={`/api/portal/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#B07D3A] hover:underline font-medium"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#dfdedd] p-6 text-center py-12">
              <p className="text-sm text-[#888780]">
                No documents available for this investment
              </p>
            </div>
          )}
        </TabsContent>

        {/* Disclosures Tab */}
        <TabsContent value="disclosures" className="mt-6">
          <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
            <p className="text-sm text-[#5f5e5a] leading-relaxed">
              Past performance is not indicative of future results. Private
              investments carry risk including loss of principal. Return figures
              are estimates and subject to final fund accounting. The information
              contained herein is confidential and intended solely for the named
              recipient.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Disclaimer box */}
      <div className="bg-[#eeece8] rounded-xl p-4 mt-6">
        <p className="text-xs text-[#888780] leading-relaxed">
          Past performance is not indicative of future results. Private
          investments carry risk including loss of principal. Return figures are
          estimates and subject to final fund accounting.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Target,
  ChevronRight,
  FileText,
  Users,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate, formatMonthYear, cn } from "@/lib/utils";

interface DashboardData {
  totalInvested: number;
  currentValue: number;
  totalDistributions: number;
  activeInvestments: number;
  totalGain: number;
  totalReturnPct: number;
  netIRR: number;
  allocation: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  investmentAllocation: {
    name: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  growth: { month: string; netValue: number; cumulativeDistributions: number }[];
  recentInvestments: {
    id: string;
    investment: { name: string; assetClass: { name: string } };
    amountInvested: number;
    currentValue: number;
    returnPercentage: number;
    status: string;
  }[];
  recentDocuments: {
    id: string;
    name: string;
    type: string;
    createdAt: string;
    mimeType: string;
    investment: { name: string } | null;
  }[];
  recentActivity: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
  lastUpdated: string;
}

type TimeRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "All";

function formatCompact(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return formatCurrency(amount);
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#dfdedd] p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyDashboard({ name }: { name: string }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="p-8 space-y-8">
      {/* Navy hero banner */}
      <div className="bg-[#1A2640] rounded-2xl p-8 md:p-12 flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <span className="inline-block bg-white/10 text-white/80 text-xs font-medium px-3 py-1 rounded-full mb-4">
            Welcome to your portal
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Good to have you, {name || "there"}.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-4">
            Your investment portal is being set up. Once your first subscription
            is confirmed, your dashboard will populate with performance data,
            documents, and activity updates.
          </p>
          <Link
            href="/support"
            className="text-[#B07D3A] hover:text-[#d4a017] text-sm font-medium transition-colors"
          >
            Contact your advisor &rarr;
          </Link>
        </div>
        <div className="hidden md:flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-4xl font-bold text-white/20">
            {initials}
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div>
        <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-4">
          Getting Started
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Step 1: Portal access - complete */}
          <div className="bg-white rounded-xl border-2 border-green-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm">Portal access</h3>
            </div>
            <p className="text-sm text-[#5f5e5a] mb-3">
              Your account is active and secure.
            </p>
            <span className="text-xs font-medium text-green-600">Complete</span>
          </div>

          {/* Step 2: First investment confirmed */}
          <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#eeece8] flex items-center justify-center text-sm font-semibold text-[#B07D3A]">
                2
              </div>
              <h3 className="font-semibold text-sm">First investment confirmed</h3>
            </div>
            <p className="text-sm text-[#5f5e5a] mb-3">
              Once your subscription is processed, your dashboard will populate.
            </p>
            <Link
              href="/support"
              className="text-xs font-medium text-[#B07D3A] hover:underline"
            >
              Questions? Contact us &rarr;
            </Link>
          </div>

          {/* Step 3: Invite your advisor */}
          <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#eeece8] flex items-center justify-center text-sm font-semibold text-[#B07D3A]">
                3
              </div>
              <h3 className="font-semibold text-sm">Invite your advisor</h3>
            </div>
            <p className="text-sm text-[#5f5e5a] mb-3">
              Give your CPA or financial advisor read-only access when you&apos;re
              ready.
            </p>
            <Link
              href="/advisors"
              className="text-xs font-medium text-[#B07D3A] hover:underline"
            >
              Set up access &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Empty sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border-2 border-dashed border-[#888780] rounded-xl p-8">
          <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-1">
            Portfolio
          </h3>
          <p className="text-xs text-[#888780] mb-6">
            Pending first investment
          </p>
          <p className="text-sm font-medium text-[#5f5e5a] mb-1">
            No investments yet
          </p>
          <p className="text-sm text-[#5f5e5a]">
            Your portfolio will appear here once your first investment is
            confirmed and processed by your relationship manager.
          </p>
        </div>

        <div className="border-2 border-dashed border-[#888780] rounded-xl p-8">
          <h3 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-1">
            Documents
          </h3>
          <p className="text-xs text-[#888780] mb-6">
            Nothing uploaded yet
          </p>
          <p className="text-sm font-medium text-[#5f5e5a] mb-1">
            No documents yet
          </p>
          <p className="text-sm text-[#5f5e5a]">
            K-1s, quarterly reports, and other investment documents will be
            uploaded here as they become available.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("1Y");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/dashboard");
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchDashboard());
  }, [fetchDashboard]);

  const growthData = data?.growth;
  const filteredGrowth = useMemo(() => {
    if (!growthData) return [];
    switch (timeRange) {
      case "1M":
        return growthData.slice(-1);
      case "3M":
        return growthData.slice(-3);
      case "6M":
        return growthData.slice(-6);
      case "YTD": {
        const currentYear = new Date().getFullYear();
        return growthData.filter((g) => g.month.startsWith(String(currentYear)));
      }
      case "1Y":
        return growthData.slice(-12);
      case "All":
        return growthData;
      default:
        return growthData;
    }
  }, [growthData, timeRange]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.totalInvested === 0) {
    return (
      <EmptyDashboard
        name={session?.user?.name?.split(" ")[0] || ""}
      />
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || "";
  const updatedDate = data.lastUpdated
    ? formatDate(data.lastUpdated)
    : formatDate(new Date().toISOString());

  const timeRanges: TimeRange[] = ["1M", "3M", "6M", "YTD", "1Y", "All"];

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a18]">
          Welcome back, {firstName}.
        </h1>
        <p className="text-[#5f5e5a] text-sm mt-1">
          Here&apos;s a clear view of where your capital stands.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Invested */}
        <div className="bg-white rounded-xl border border-[#dfdedd] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-[#1A2640]/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-[#1A2640]" />
            </div>
            <p className="text-xs text-[#888780] font-medium uppercase tracking-wider">
              Total Invested
            </p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">
            {formatCurrency(data.totalInvested)}
          </p>
          <p className="text-xs text-[#888780] mt-1">
            Across {data.activeInvestments} active investment{data.activeInvestments !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Current Value */}
        <div className="bg-white rounded-xl border border-[#dfdedd] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-[#B07D3A]/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#B07D3A]" />
            </div>
            <p className="text-xs text-[#888780] font-medium uppercase tracking-wider">
              Current Value
            </p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">
            {formatCurrency(data.currentValue)}
          </p>
          <p className="text-xs text-[#888780] mt-1">
            Updated {updatedDate}
          </p>
        </div>

        {/* Total Returns */}
        <div className="bg-white rounded-xl border border-[#dfdedd] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-[#1A2640]/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[#1A2640]" />
            </div>
            <p className="text-xs text-[#888780] font-medium uppercase tracking-wider">
              Total Returns
            </p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">
            {formatCurrency(data.totalGain)}
          </p>
          <p className={cn("text-xs mt-1 font-medium", data.totalReturnPct >= 0 ? "text-green-600" : "text-red-600")}>
            {data.totalReturnPct >= 0 ? "+" : ""}
            {data.totalReturnPct.toFixed(1)}% Net Return
          </p>
        </div>

        {/* Cash Distributed */}
        <div className="bg-white rounded-xl border border-[#dfdedd] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-[#1A2640]/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-[#1A2640]" />
            </div>
            <p className="text-xs text-[#888780] font-medium uppercase tracking-wider">
              Cash Distributed
            </p>
          </div>
          <p className="text-2xl font-bold text-[#1a1a18]">
            {formatCurrency(data.totalDistributions)}
          </p>
          <p className="text-xs text-[#888780] mt-1">
            Since inception
          </p>
        </div>
      </div>

      {/* Performance Chart - Full Width */}
      <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase">
              Performance
            </h2>
            <div className="flex gap-1">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    timeRange === range
                      ? "bg-[#1A2640] text-white"
                      : "text-[#888780] hover:bg-[#eeece8]"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-5 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#1A2640] rounded-full" />
              <span className="text-xs text-[#888780]">Portfolio Value</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#B07D3A] rounded-full" />
              <span className="text-xs text-[#888780]">Cash Distributed</span>
            </div>
          </div>
          {filteredGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={filteredGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eeece8" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#888780" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    const parts = val.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return months[parseInt(parts[1]) - 1] || val;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888780" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`}
                  width={60}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0)),
                    name === "netValue" ? "Portfolio Value" : "Cash Distributed",
                  ]}
                  labelFormatter={(label) => {
                    const parts = label.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
                  }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #dfdedd",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netValue"
                  stroke="#1A2640"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#1A2640" }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeDistributions"
                  stroke="#B07D3A"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#B07D3A" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#888780]">
              No growth data available yet
            </div>
          )}
      </div>

      {/* Allocation Donuts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset Class Allocation */}
        <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
          <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-5">
            Asset Class Allocation
          </h2>
          {data.allocation && data.allocation.length > 0 ? (
            <div>
              <div className="flex justify-center mb-4">
                <PieChart width={200} height={200}>
                  <Pie
                    data={data.allocation}
                    cx={100}
                    cy={100}
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.allocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-2.5">
                {data.allocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#1a1a18]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#888780] tabular-nums">{item.percentage.toFixed(1)}%</span>
                      <span className="text-[#5f5e5a] tabular-nums text-xs">{formatCompact(item.value)}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-[#eeece8] pt-2 flex items-center justify-between text-sm font-medium">
                  <span className="text-[#1a1a18]">Total</span>
                  <span className="text-[#1a1a18] tabular-nums">
                    {formatCurrency(data.allocation.reduce((sum, a) => sum + a.value, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#888780]">
              No allocation data available
            </div>
          )}
        </div>

        {/* Investment Allocation */}
        {data.investmentAllocation && data.investmentAllocation.length > 1 ? (
          <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
            <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-5">
              Investment Allocation
            </h2>
            <div>
              <div className="flex justify-center mb-4">
                <PieChart width={200} height={200}>
                  <Pie
                    data={data.investmentAllocation}
                    cx={100}
                    cy={100}
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.investmentAllocation.map((entry, index) => (
                      <Cell key={`inv-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-2.5">
                {data.investmentAllocation.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#1a1a18]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#888780] tabular-nums">{item.percentage.toFixed(1)}%</span>
                      <span className="text-[#5f5e5a] tabular-nums text-xs">{formatCompact(item.value)}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t border-[#eeece8] pt-2 flex items-center justify-between text-sm font-medium">
                  <span className="text-[#1a1a18]">Total</span>
                  <span className="text-[#1a1a18] tabular-nums">
                    {formatCurrency(data.investmentAllocation.reduce((sum, a) => sum + a.value, 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : <div />}
      </div>

      {/* Investments + Activity/Docs Row */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Investments Table - 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#dfdedd] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase">
              Investments
            </h2>
            <Link
              href="/investments"
              className="text-xs text-[#B07D3A] hover:underline font-medium"
            >
              View all &rarr;
            </Link>
          </div>
          {data.recentInvestments && data.recentInvestments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dfdedd]">
                    <th className="text-left text-[10px] font-semibold text-[#888780] tracking-widest uppercase py-2">
                      Investment
                    </th>
                    <th className="text-left text-[10px] font-semibold text-[#888780] tracking-widest uppercase py-2">
                      Asset Class
                    </th>
                    <th className="text-right text-[10px] font-semibold text-[#888780] tracking-widest uppercase py-2">
                      Invested
                    </th>
                    <th className="text-right text-[10px] font-semibold text-[#888780] tracking-widest uppercase py-2">
                      Current Value
                    </th>
                    <th className="text-right text-[10px] font-semibold text-[#888780] tracking-widest uppercase py-2">
                      Return
                    </th>
                    <th className="text-center text-[10px] font-semibold text-[#888780] tracking-widest uppercase py-2">
                      Status
                    </th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInvestments.map((inv) => (
                    <tr key={inv.id} className="border-b border-[#eeece8] last:border-0 hover:bg-[#fafaf8] transition-colors">
                      <td className="py-3">
                        <Link
                          href={`/investments/${inv.id}`}
                          className="font-medium text-[#1a1a18] hover:text-[#B07D3A] transition-colors"
                        >
                          {inv.investment.name}
                        </Link>
                      </td>
                      <td className="py-3 text-[#5f5e5a] text-xs">
                        {inv.investment.assetClass.name}
                      </td>
                      <td className="text-right py-3 tabular-nums text-[#5f5e5a]">
                        {formatCompact(inv.amountInvested)}
                      </td>
                      <td className="text-right py-3 tabular-nums text-[#1a1a18] font-medium">
                        {formatCompact(inv.currentValue)}
                      </td>
                      <td
                        className={cn(
                          "text-right py-3 font-medium tabular-nums",
                          inv.returnPercentage >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {inv.returnPercentage >= 0 ? "+" : ""}
                        {inv.returnPercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                            inv.status === "ACTIVE"
                              ? "border-[#3b6d11]/20 text-[#3b6d11] bg-[#eaf3de]"
                              : "border-[#185fa5]/20 text-[#185fa5] bg-[#e6f1fb]"
                          )}
                        >
                          {inv.status === "ACTIVE" ? "Active" : "Performing"}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link href={`/investments/${inv.id}`}>
                          <ChevronRight className="h-4 w-4 text-[#888780]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#888780]">No investments yet</p>
          )}
        </div>

        {/* Activity + Documents - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
            <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase mb-4">
              Recent Activity
            </h2>
            {data.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-full bg-[#B07D3A]/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 text-[#B07D3A]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a18]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#888780] mt-0.5">
                        {formatMonthYear(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#888780]">No recent activity</p>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-[#888780] tracking-widest uppercase">
                Documents
              </h2>
              <Link
                href="/documents"
                className="text-xs text-[#B07D3A] hover:underline font-medium"
              >
                View all &rarr;
              </Link>
            </div>
            {data.recentDocuments && data.recentDocuments.length > 0 ? (
              <div className="space-y-3">
                {data.recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#eeece8] flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-[#5f5e5a]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a1a18]">
                          {doc.name}
                        </p>
                        <p className="text-xs text-[#888780]">
                          {doc.type.replace(/_/g, " ")}
                          {doc.investment ? ` \u00b7 ${doc.investment.name}` : ""}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/portal/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 rounded-lg hover:bg-[#eeece8] flex items-center justify-center transition-colors shrink-0"
                    >
                      <Download className="h-4 w-4 text-[#B07D3A]" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#888780]">
                No documents available yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CTA Banner - Invite Advisor */}
      <div className="bg-[#1A2640] rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">
              Share Access with Your Advisor
            </h3>
            <p className="text-white/60 text-sm mt-0.5">
              Give your CPA or financial advisor read-only portal access.
            </p>
          </div>
        </div>
        <Link
          href="/advisors"
          className="bg-white text-[#1A2640] px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors shrink-0"
        >
          Invite Advisor
        </Link>
      </div>
    </div>
  );
}

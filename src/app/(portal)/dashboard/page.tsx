"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "recharts";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

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
  growth: { month: string; netValue: number }[];
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
          <div key={i} className="bg-white rounded-xl border border-[#e8e0d4] p-5">
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
      <div className="bg-[#0f1c2e] rounded-2xl p-8 md:p-12 flex items-center justify-between relative overflow-hidden">
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
            className="text-[#b8860b] hover:text-[#d4a017] text-sm font-medium transition-colors"
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
        <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-4">
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
            <p className="text-sm text-[#6b7280] mb-3">
              Your account is active and secure.
            </p>
            <span className="text-xs font-medium text-green-600">Complete</span>
          </div>

          {/* Step 2: First investment confirmed */}
          <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#f5f0e8] flex items-center justify-center text-sm font-semibold text-[#b8860b]">
                2
              </div>
              <h3 className="font-semibold text-sm">First investment confirmed</h3>
            </div>
            <p className="text-sm text-[#6b7280] mb-3">
              Once your subscription is processed, your dashboard will populate.
            </p>
            <Link
              href="/support"
              className="text-xs font-medium text-[#b8860b] hover:underline"
            >
              Questions? Contact us &rarr;
            </Link>
          </div>

          {/* Step 3: Invite your advisor */}
          <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-[#f5f0e8] flex items-center justify-center text-sm font-semibold text-[#b8860b]">
                3
              </div>
              <h3 className="font-semibold text-sm">Invite your advisor</h3>
            </div>
            <p className="text-sm text-[#6b7280] mb-3">
              Give your CPA or financial advisor read-only access when you&apos;re
              ready.
            </p>
            <Link
              href="/advisors"
              className="text-xs font-medium text-[#b8860b] hover:underline"
            >
              Set up access &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Empty sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border-2 border-dashed border-[#d4c5a9] rounded-xl p-8">
          <h3 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-1">
            Portfolio
          </h3>
          <p className="text-xs text-[#9a8c7a] mb-6">
            Pending first investment
          </p>
          <p className="text-sm font-medium text-[#4a4a4a] mb-1">
            No investments yet
          </p>
          <p className="text-sm text-[#6b7280]">
            Your portfolio will appear here once your first investment is
            confirmed and processed by your relationship manager.
          </p>
        </div>

        <div className="border-2 border-dashed border-[#d4c5a9] rounded-xl p-8">
          <h3 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-1">
            Documents
          </h3>
          <p className="text-xs text-[#9a8c7a] mb-6">
            Nothing uploaded yet
          </p>
          <p className="text-sm font-medium text-[#4a4a4a] mb-1">
            No documents yet
          </p>
          <p className="text-sm text-[#6b7280]">
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
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

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
            Welcome back, {firstName}.
          </h1>
          <p className="text-[#6b7280] text-sm mt-1">
            Here&apos;s where your capital stands.
          </p>
        </div>
        <p className="text-xs text-[#9a8c7a]">Updated {updatedDate}</p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Total Invested
          </p>
          <p className="text-2xl font-bold text-[#1a1a1a]">
            {formatCurrency(data.totalInvested)}
          </p>
          <p className="text-xs text-[#9a8c7a] mt-1">
            {data.activeInvestments} investment{data.activeInvestments !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Current Value
          </p>
          <p className="text-2xl font-bold text-[#1a1a1a]">
            {formatCurrency(data.currentValue)}
          </p>
          <p className={cn("text-xs mt-1", data.totalGain >= 0 ? "text-green-600" : "text-red-600")}>
            {data.totalGain >= 0 ? "+" : ""}
            {formatCurrency(data.totalGain)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Total Return
          </p>
          <p className={cn("text-2xl font-bold", data.totalReturnPct >= 0 ? "text-green-600" : "text-red-600")}>
            {data.totalReturnPct >= 0 ? "+" : ""}
            {data.totalReturnPct.toFixed(1)}%
          </p>
          <p className="text-xs text-[#9a8c7a] mt-1">
            Net IRR: {data.netIRR.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Cash Distributed
          </p>
          <p className="text-2xl font-bold text-[#1a1a1a]">
            {formatCurrency(data.totalDistributions)}
          </p>
          <p className="text-xs text-[#9a8c7a] mt-1">YTD</p>
        </div>
      </div>

      {/* Allocation + Growth */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Allocation */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-5">
            Allocation
          </h2>
          {data.allocation && data.allocation.length > 0 ? (
            <div className="space-y-4">
              {data.allocation.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#1a1a1a]">{item.name}</span>
                    <span className="text-[#6b7280] tabular-nums">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#f5f0e8] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#9a8c7a]">
              No allocation data available
            </div>
          )}
        </div>

        {/* Portfolio Growth */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-5">
            Portfolio Growth
          </h2>
          {data.growth && data.growth.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d4" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9a8c7a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9a8c7a" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`}
                  width={60}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Value"]}
                  labelStyle={{ color: "#1a1a1a" }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e8e0d4",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="netValue"
                  stroke="#b8860b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#b8860b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-[#9a8c7a]">
              No growth data available yet
            </div>
          )}
        </div>
      </div>

      {/* Active Investments Table */}
      {data.recentInvestments && data.recentInvestments.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase">
              Active Investments
            </h2>
            <Link
              href="/investments"
              className="text-xs text-[#b8860b] hover:underline font-medium"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e0d4]">
                  <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2">
                    Deal
                  </th>
                  <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2">
                    Invested
                  </th>
                  <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2">
                    Return
                  </th>
                  <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2 pl-4">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentInvestments.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#f5f0e8] last:border-0">
                    <td className="py-3">
                      <Link
                        href={`/investments/${inv.id}`}
                        className="font-medium text-[#1a1a1a] hover:text-[#b8860b] transition-colors"
                      >
                        {inv.investment.name}
                      </Link>
                    </td>
                    <td className="text-right py-3 tabular-nums text-[#4a4a4a]">
                      {formatCompact(inv.amountInvested)}
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
                    <td className="py-3 pl-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                          inv.status === "ACTIVE"
                            ? "border-green-300 text-green-700 bg-green-50"
                            : "border-blue-300 text-blue-700 bg-blue-50"
                        )}
                      >
                        {inv.status === "ACTIVE" ? "Active" : "Performing"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Documents */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase">
              Documents
            </h2>
            <Link
              href="/documents"
              className="text-xs text-[#b8860b] hover:underline font-medium"
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
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {doc.name}
                    </p>
                    <p className="text-xs text-[#9a8c7a]">
                      {doc.type.replace(/_/g, " ")}
                      {doc.investment ? ` \u00b7 ${doc.investment.name}` : ""}
                    </p>
                  </div>
                  <a
                    href={`/api/portal/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#b8860b] hover:underline font-medium shrink-0 ml-4"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#9a8c7a]">
              No documents available yet
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-4">
            Recent Activity
          </h2>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {data.recentActivity.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-[#b8860b] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#9a8c7a] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#9a8c7a]">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

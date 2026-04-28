"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateOnly, cn } from "@/lib/utils";

interface AllocationItem {
  name: string;
  percentage: number;
  color: string;
}

interface InvestmentItem {
  id: string;
  name: string;
  amountInvested: number;
  currentValue: number;
  status: string;
}

interface DocumentItem {
  id: string;
  title: string;
  docType: string;
  createdAt: string;
}

interface ClientViewData {
  client: { name: string; company: string | null };
  permissionLevel: string;
  totalInvested: number;
  currentValue: number;
  totalGain: number;
  totalReturnPct: number;
  allocation: AllocationItem[];
  investments: InvestmentItem[];
  documents?: DocumentItem[];
}

function permissionLabel(level: string) {
  const labels: Record<string, string> = {
    DASHBOARD_ONLY: "Dashboard Only",
    DASHBOARD_AND_TAX_DOCUMENTS: "Dashboard + Tax Docs",
    DASHBOARD_AND_DOCUMENTS: "Dashboard + All Docs",
    SPECIFIC_INVESTMENT: "Specific Investment",
  };
  return labels[level] || level;
}

function statusBadge(status: string) {
  const isActive = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        isActive
          ? "border-green-300 text-green-700 bg-green-50"
          : "border-blue-300 text-blue-700 bg-blue-50"
      )}
    >
      {status === "ACTIVE" ? "Active" : status === "PENDING" ? "Pending" : "Redeemed"}
    </span>
  );
}

function ClientViewSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-8 w-64 mb-1" />
      <Skeleton className="h-4 w-32 mb-6" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e8e0d4] p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdvisorClientViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ClientViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/advisor/clients/${id}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error("You do not have access to this client.");
        throw new Error("Failed to load client data");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  if (loading) return <ClientViewSkeleton />;

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#9a8c7a]">
        <Link
          href="/advisor/dashboard"
          className="hover:text-[#b8860b] transition-colors"
        >
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-[#1a1a1a]">{data.client.name}</span>
      </nav>

      {/* Title + permission */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
          {data.client.name}
        </h1>
        {data.client.company && (
          <p className="text-sm text-[#9a8c7a] mt-0.5">{data.client.company}</p>
        )}
        <div className="mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-[#e8e0d4] text-[#9a8c7a] bg-[#faf8f5]">
            {permissionLabel(data.permissionLevel)}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Total Invested
          </p>
          <p className="text-2xl font-bold text-[#1a1a1a]">
            {formatCurrency(data.totalInvested)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Current Value
          </p>
          <p className="text-2xl font-bold text-[#1a1a1a]">
            {formatCurrency(data.currentValue)}
          </p>
          <p
            className={cn(
              "text-xs mt-1",
              data.totalGain >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {data.totalGain >= 0 ? "+" : ""}
            {formatCurrency(data.totalGain)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Total Return
          </p>
          <p
            className={cn(
              "text-2xl font-bold",
              data.totalReturnPct >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {data.totalReturnPct >= 0 ? "+" : ""}
            {data.totalReturnPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Allocation */}
      {data.allocation && data.allocation.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-5">
            Allocation
          </h2>
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
        </div>
      )}

      {/* Investments Table */}
      {data.investments && data.investments.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-4">
            Investments
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8e0d4]">
                  <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2">
                    Investment
                  </th>
                  <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2">
                    Invested
                  </th>
                  <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2">
                    Current Value
                  </th>
                  <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase py-2 pl-4">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.investments.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-[#f5f0e8] last:border-0"
                  >
                    <td className="py-3 font-medium text-[#1a1a1a]">
                      {inv.name}
                    </td>
                    <td className="text-right py-3 tabular-nums text-[#4a4a4a]">
                      {formatCurrency(inv.amountInvested)}
                    </td>
                    <td className="text-right py-3 tabular-nums text-[#4a4a4a]">
                      {formatCurrency(inv.currentValue)}
                    </td>
                    <td className="py-3 pl-4">{statusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents (if permission allows) */}
      {data.documents && data.documents.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase">
              Documents
            </h2>
            <Link
              href={`/advisor/clients/${id}/documents`}
              className="text-xs text-[#b8860b] hover:underline font-medium"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {data.documents.slice(0, 5).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {doc.title}
                  </p>
                  <p className="text-xs text-[#9a8c7a]">
                    {doc.docType.replace(/_/g, " ")} &middot;{" "}
                    {formatDateOnly(doc.createdAt)}
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
        </div>
      )}
    </div>
  );
}

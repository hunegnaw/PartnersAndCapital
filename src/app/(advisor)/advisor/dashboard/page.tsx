"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateOnly } from "@/lib/utils";

interface ClientData {
  id: string;
  name: string;
  email: string;
  company: string | null;
  totalInvested: number;
  currentValue: number;
  permissionLevel: string;
  accessExpiry: string | null;
  lastUpdated: string;
}

interface DashboardData {
  clients: ClientData[];
}

function permissionBadge(level: string) {
  const labels: Record<string, string> = {
    DASHBOARD_ONLY: "Dashboard Only",
    DASHBOARD_AND_TAX_DOCUMENTS: "Dashboard + Tax Docs",
    DASHBOARD_AND_DOCUMENTS: "Dashboard + All Docs",
    SPECIFIC_INVESTMENT: "Specific Investment",
  };

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#e8e0d4] text-[#9a8c7a] bg-[#faf8f5]">
      {labels[level] || level}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e8e0d4] p-6">
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-32 mt-3" />
            <Skeleton className="h-9 w-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdvisorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/advisor/dashboard");
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

  const clients = data?.clients || [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
          Your Clients
        </h1>
        <p className="text-sm text-[#9a8c7a] mt-1">
          {clients.length} client portfolio{clients.length !== 1 ? "s" : ""} you
          have access to.
        </p>
      </div>

      {/* Client cards */}
      {clients.length === 0 ? (
        <div className="border-2 border-dashed border-[#d4c5a9] rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-[#4a4a4a] mb-1">
            No active client access.
          </p>
          <p className="text-sm text-[#9a8c7a]">
            Invitations will appear here once accepted.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-[#e8e0d4] p-6 flex flex-col"
            >
              {/* Client info */}
              <div className="mb-3">
                <h3 className="font-semibold text-[#1a1a1a]">{client.name}</h3>
                {client.company && (
                  <p className="text-sm text-[#9a8c7a] mt-0.5">
                    {client.company}
                  </p>
                )}
              </div>

              {/* Permission badge */}
              <div className="mb-4">{permissionBadge(client.permissionLevel)}</div>

              {/* Stats */}
              <div className="flex gap-6 mb-3">
                <div>
                  <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-wider uppercase">
                    Invested
                  </p>
                  <p className="text-sm font-semibold text-[#1a1a1a] tabular-nums">
                    {formatCurrency(client.totalInvested)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-wider uppercase">
                    Current Value
                  </p>
                  <p className="text-sm font-semibold text-[#1a1a1a] tabular-nums">
                    {formatCurrency(client.currentValue)}
                  </p>
                </div>
              </div>

              {/* Expiry */}
              <p className="text-xs text-[#9a8c7a] mb-4">
                {client.accessExpiry
                  ? `Expires: ${formatDateOnly(client.accessExpiry)}`
                  : "No expiration"}
              </p>

              {/* View button */}
              <Link
                href={`/advisor/clients/${client.id}`}
                className="mt-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-[#b8860b] text-[#b8860b] hover:bg-[#b8860b] hover:text-white transition-colors"
              >
                View Portfolio
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

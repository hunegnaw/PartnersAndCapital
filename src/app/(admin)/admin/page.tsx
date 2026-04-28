"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientFormDialog } from "@/components/admin/client-form-dialog";
import {
  Search,
  Plus,
  Pencil,
  Archive,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface Stats {
  totalClients: number;
  newClientsThisMonth: number;
  activeInvestments: number;
  totalAUM: number;
  pendingSetupClients: number;
  activePortals: number;
  latestAuditEntry: {
    action: string;
    createdAt: string;
    userName: string;
  } | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
  _count: {
    clientInvestments: number;
    documents: number;
  };
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatAuditAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase();
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(
    undefined
  );
  const [archiving, setArchiving] = useState<string | null>(null);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch {
        // stats error handled silently
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        status: status === "all" ? "active" : status,
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/clients?${params}`);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data.clients);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  useEffect(() => {
    Promise.resolve().then(() => fetchClients());
  }, [fetchClients]);

  function handleEdit(client: Client) {
    setEditingClient(client);
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditingClient(undefined);
    setDialogOpen(true);
  }

  async function handleArchive(clientId: string) {
    if (archiving) return;
    if (
      !confirm(
        "Are you sure you want to archive this client? This action can be undone."
      )
    )
      return;

    setArchiving(clientId);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to archive client");
      fetchClients();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to archive client"
      );
    } finally {
      setArchiving(null);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">
            Client Management
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Add, update, and manage investor profiles. Records are archived, not
            deleted.
          </p>
        </div>
        <Button onClick={handleAdd} className="bg-[#0f1c2e] hover:bg-[#1a2d45]">
          <Plus className="h-4 w-4 mr-1" />
          Add Client
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 3 Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Total Clients
          </p>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <p className="text-2xl font-bold text-[#1a1a1a]">
                {stats?.totalClients ?? 0}
              </p>
              <p className="text-xs text-[#9a8c7a] mt-1">
                +{stats?.newClientsThisMonth ?? 0} this month
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            Active Portals
          </p>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <p className="text-2xl font-bold text-[#1a1a1a]">
                {stats?.activePortals ?? 0}
              </p>
              <p className="text-xs text-[#9a8c7a] mt-1">
                {stats?.pendingSetupClients ?? 0} pending setup
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
          <p className="text-xs text-[#9a8c7a] font-medium uppercase tracking-wider mb-1">
            AUM (Total)
          </p>
          {statsLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <>
              <p className="text-2xl font-bold text-[#1a1a1a]">
                {formatCurrency(stats?.totalAUM ?? 0)}
              </p>
              <p className="text-xs text-[#9a8c7a] mt-1">
                Across {stats?.activeInvestments ?? 0} deals
              </p>
            </>
          )}
        </div>
      </div>

      {/* Audit status bar */}
      <div className="bg-white rounded-xl border border-[#e8e0d4] px-5 py-3 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        <p className="text-sm text-[#4a4a4a]">
          Audit log active — all changes tracked.
          {stats?.latestAuditEntry && (
            <>
              {" "}
              Last action: {formatAuditAction(stats.latestAuditEntry.action)}{" "}
              &middot; {formatTimeAgo(stats.latestAuditEntry.createdAt)} by{" "}
              {stats.latestAuditEntry.userName}
            </>
          )}
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a8c7a]" />
          <Input
            placeholder="Search clients..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-white border-[#e8e0d4]"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] bg-white border-[#e8e0d4]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v ?? "all")}
        >
          <SelectTrigger className="w-[160px] bg-white border-[#e8e0d4]">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="CLIENT">Client</SelectItem>
          </SelectContent>
        </Select>
        <a href="/api/admin/clients/export" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="border-[#e8e0d4]">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </a>
      </div>

      {/* Tabs */}
      <Tabs
        value={status}
        onValueChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
      >
        <TabsList className="bg-white border border-[#e8e0d4]">
          <TabsTrigger value="all">All Clients</TabsTrigger>
          <TabsTrigger value="pending">Pending Setup</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Client Table */}
      <div className="bg-white rounded-xl border border-[#e8e0d4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8e0d4]">
                <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase px-4 py-3">
                  Client
                </th>
                <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase px-4 py-3 hidden md:table-cell">
                  Invested
                </th>
                <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase px-4 py-3 hidden md:table-cell">
                  Current Value
                </th>
                <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase px-4 py-3 hidden lg:table-cell">
                  Last Login
                </th>
                <th className="text-left text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase px-4 py-3">
                  Status
                </th>
                <th className="text-right text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f5f0e8]">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-[#9a8c7a]"
                  >
                    {search
                      ? "No clients match your search."
                      : "No clients yet. Add your first client to get started."}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-[#f5f0e8] last:border-0 cursor-pointer hover:bg-[#faf8f5] transition-colors"
                    onClick={() => router.push(`/admin/clients/${client.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[#1a1a1a]">
                          {client.name}
                        </p>
                        <p className="text-xs text-[#9a8c7a]">
                          {client.email}
                          {client.company && ` \u00b7 ${client.company}`}
                        </p>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 hidden md:table-cell tabular-nums text-[#4a4a4a]">
                      {client._count.clientInvestments > 0 ? "—" : "—"}
                    </td>
                    <td className="text-right px-4 py-3 hidden md:table-cell tabular-nums text-[#4a4a4a]">
                      —
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-[#9a8c7a]">
                      {client.lastLoginAt
                        ? formatDate(client.lastLoginAt)
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "text-[10px] font-medium border",
                          client.deletedAt
                            ? "border-red-200 text-red-600 bg-red-50"
                            : client._count.clientInvestments > 0
                              ? "border-green-300 text-green-700 bg-green-50"
                              : "border-amber-300 text-amber-700 bg-amber-50"
                        )}
                      >
                        {client.deletedAt
                          ? "Archived"
                          : client._count.clientInvestments > 0
                            ? "Active"
                            : "Pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!client.deletedAt && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(client)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#9a8c7a] hover:text-red-600"
                              onClick={() => handleArchive(client.id)}
                              disabled={archiving === client.id}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#9a8c7a]">
            Showing {(page - 1) * pageSize + 1}—
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-[#e8e0d4]"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="border-[#e8e0d4]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={
          editingClient
            ? {
                ...editingClient,
                phone: editingClient.phone ?? undefined,
                company: editingClient.company ?? undefined,
              }
            : undefined
        }
        onSuccess={fetchClients}
      />
    </div>
  );
}

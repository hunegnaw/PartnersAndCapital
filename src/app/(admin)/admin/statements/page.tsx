"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { statementYearOptions } from "@/lib/utils"
import {
  AlertCircle,
  Loader2,
  Eye,
  Check,
  X,
  RefreshCw,
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StatementRow {
  id: string
  userId: string
  statementDate: string
  periodStart: string
  periodEnd: string
  status: string
  totalInvested: number
  currentValue: number
  totalDistributions: number
  generatedAt: string
  approvedAt: string | null
  sentAt: string | null
  rejectionReason: string | null
  user: { id: string; name: string | null; email: string }
  approver: { id: string; name: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  GENERATED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SENT: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n)
}

// Clickable, sortable column header (matches the distributions table pattern).
function SortHead({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string
  sortKey: string
  sortBy: string
  sortDir: "asc" | "desc"
  onSort: (key: string, dir: "asc" | "desc") => void
  align?: "left" | "right"
}) {
  const active = sortBy === sortKey
  return (
    <th className={`p-3 text-xs font-medium text-muted-foreground uppercase ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 uppercase hover:text-foreground transition-colors ${align === "right" ? "flex-row-reverse" : ""}`}
        onClick={() => onSort(sortKey, active ? (sortDir === "asc" ? "desc" : "asc") : "asc")}
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  )
}

export default function AdminStatementsPage() {
  const [statements, setStatements] = useState<StatementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState("period")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [bulkAction, setBulkAction] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1)
  const [genYear, setGenYear] = useState(new Date().getFullYear())
  const [genMonthToDate, setGenMonthToDate] = useState(false)
  const [clients, setClients] = useState<{ id: string; name: string | null; email: string }[]>([])
  const [genClientIds, setGenClientIds] = useState<string[]>([])
  const [genAllClients, setGenAllClients] = useState(true)
  const [clientSearch, setClientSearch] = useState("")

  // Approval modal + email-suppression feature
  const [emailSuppressionEnabled, setEmailSuppressionEnabled] = useState(false)
  const [approveTarget, setApproveTarget] = useState<StatementRow | null>(null)
  const [approveSendEmail, setApproveSendEmail] = useState(true)
  const [approving, setApproving] = useState(false)

  const fetchStatements = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("sortBy", sortBy)
      params.set("sortDir", sortDir)
      const res = await fetch(`/api/admin/statements?${params}`)
      if (!res.ok) throw new Error("Failed to fetch statements")
      const data = await res.json()
      setStatements(data.statements)
      setTotal(data.total)
      setStatusCounts(data.statusCounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, sortBy, sortDir])

  useEffect(() => {
    Promise.resolve().then(fetchStatements)
  }, [fetchStatements])

  // Load the email-suppression feature flag (controls whether the approve modal appears)
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setEmailSuppressionEnabled(Boolean(d.statementEmailSuppressionEnabled)) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/admin/clients?pageSize=100")
        if (res.ok) {
          const data = await res.json()
          const list = (data.clients || data).map((c: { id: string; name: string | null; email: string }) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          }))
          setClients(list)
        }
      } catch {}
    }
    loadClients()
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { month: genMonth, year: genYear, monthToDate: genMonthToDate }
      if (!genAllClients && genClientIds.length > 0) {
        body.clientIds = genClientIds
      }
      const res = await fetch("/api/admin/statements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Generation failed")
      }
      setGenerateOpen(false)
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  // Clicking approve: open the confirmation modal when the feature is enabled,
  // otherwise approve immediately (email sent — the existing behavior).
  function openApprove(s: StatementRow) {
    if (emailSuppressionEnabled) {
      setApproveTarget(s)
      setApproveSendEmail(true)
    } else {
      handleApprove(s.id, true)
    }
  }

  async function handleApprove(id: string, sendEmail: boolean) {
    setApproving(true)
    try {
      const res = await fetch(`/api/admin/statements/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail }),
      })
      if (!res.ok) throw new Error("Failed to approve")
      setApproveTarget(null)
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed")
    } finally {
      setApproving(false)
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason (optional):")
    if (reason === null) return
    // Optimistic update — show REJECTED status immediately
    setStatements((prev) => prev.map((s) => s.id === id ? { ...s, status: "REJECTED" } : s))
    try {
      const res = await fetch(`/api/admin/statements/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error("Failed to reject")
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed")
      await fetchStatements()
    }
  }

  async function handleRegenerate(id: string) {
    try {
      const res = await fetch(`/api/admin/statements/${id}/regenerate`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to regenerate")
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rejected statement?")) return
    try {
      const res = await fetch(`/api/admin/statements/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return
    setBulkAction(true)
    try {
      const res = await fetch("/api/admin/statements/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementIds: Array.from(selected) }),
      })
      if (!res.ok) throw new Error("Bulk approve failed")
      setSelected(new Set())
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk approve failed")
    } finally {
      setBulkAction(false)
    }
  }

  async function handleBulkReject() {
    if (selected.size === 0) return
    const reason = prompt("Rejection reason (optional):")
    setBulkAction(true)
    try {
      const res = await fetch("/api/admin/statements/bulk-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementIds: Array.from(selected), reason }),
      })
      if (!res.ok) throw new Error("Bulk reject failed")
      setSelected(new Set())
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk reject failed")
    } finally {
      setBulkAction(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === statements.length) setSelected(new Set())
    else setSelected(new Set(statements.map((s) => s.id)))
  }

  const filteredClients = clients.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statements</h1>
          <p className="text-muted-foreground mt-1">
            Generate, review, and approve client statements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/statements/banners">
            <Button variant="outline" size="sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Banners
            </Button>
          </Link>
          <Link href="/admin/statements/content">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Content
            </Button>
          </Link>
          <Button onClick={() => setGenerateOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Statements
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
        <TabsList>
          <TabsTrigger value="ALL">
            All ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
          </TabsTrigger>
          <TabsTrigger value="GENERATED">
            Pending ({statusCounts.GENERATED || 0})
          </TabsTrigger>
          <TabsTrigger value="APPROVED">
            Approved ({statusCounts.APPROVED || 0})
          </TabsTrigger>
          <TabsTrigger value="SENT">
            Sent ({statusCounts.SENT || 0})
          </TabsTrigger>
          <TabsTrigger value="REJECTED">
            Rejected ({statusCounts.REJECTED || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" onClick={handleBulkApprove} disabled={bulkAction}>
            {bulkAction ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
            Approve Selected
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkReject} disabled={bulkAction}>
            <X className="h-3 w-3 mr-1" />
            Reject Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={statements.length > 0 && selected.size === statements.length}
                    onChange={toggleAll}
                  />
                </th>
                <SortHead label="Client" sortKey="client" sortBy={sortBy} sortDir={sortDir} onSort={(k, d) => { setSortBy(k); setSortDir(d); setPage(1) }} />
                <SortHead label="Period" sortKey="period" sortBy={sortBy} sortDir={sortDir} onSort={(k, d) => { setSortBy(k); setSortDir(d); setPage(1) }} />
                <SortHead label="Total Invested" sortKey="totalInvested" sortBy={sortBy} sortDir={sortDir} onSort={(k, d) => { setSortBy(k); setSortDir(d); setPage(1) }} align="right" />
                <SortHead label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={(k, d) => { setSortBy(k); setSortDir(d); setPage(1) }} />
                <SortHead label="Generated" sortKey="generated" sortBy={sortBy} sortDir={sortDir} onSort={(k, d) => { setSortBy(k); setSortDir(d); setPage(1) }} />
                <SortHead label="Approved By" sortKey="approver" sortBy={sortBy} sortDir={sortDir} onSort={(k, d) => { setSortBy(k); setSortDir(d); setPage(1) }} />
                <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {statements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No statements found. Click &quot;Generate Statements&quot; to create statements for a period.
                  </td>
                </tr>
              ) : (
                statements.map((s) => {
                  const period = new Date(s.periodStart)
                  const periodLabel = `${MONTH_NAMES[period.getMonth()]} ${period.getFullYear()}`
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-sm">{s.user.name || s.user.email}</div>
                        <div className="text-xs text-muted-foreground">{s.user.email}</div>
                      </td>
                      <td className="p-3 text-sm">{periodLabel}</td>
                      <td className="p-3 text-sm text-right tabular-nums">{formatCurrency(s.totalInvested)}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-800"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(s.generatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {s.approver?.name || "—"}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/api/admin/statements/${s.id}/preview`, "_blank")}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {s.status === "GENERATED" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => openApprove(s)} title="Approve">
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleReject(s.id)} title="Reject">
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {(s.status === "REJECTED" || s.status === "GENERATED") && (
                            <Button variant="ghost" size="sm" onClick={() => handleRegenerate(s.id)} title="Regenerate">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { if (v) { setPageSize(parseInt(v, 10)); setPage(1) } }}
              >
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-1">
                {page} / {totalPages || 1}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Statements</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(genMonth)} onValueChange={(v) => v && setGenMonth(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(genYear)} onValueChange={(v) => v && setGenYear(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statementYearOptions().map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="monthToDate"
                checked={genMonthToDate}
                onChange={(e) => setGenMonthToDate(e.target.checked)}
              />
              <Label htmlFor="monthToDate" className="font-normal">
                Month-to-date (use today&apos;s date as end of period)
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Clients</Label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="allClients"
                  checked={genAllClients}
                  onChange={(e) => {
                    setGenAllClients(e.target.checked)
                    if (e.target.checked) setGenClientIds([])
                  }}
                />
                <Label htmlFor="allClients" className="font-normal">All active clients with investments</Label>
              </div>
              {!genAllClients && (
                <>
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                    {filteredClients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={genClientIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setGenClientIds([...genClientIds, c.id])
                            else setGenClientIds(genClientIds.filter((id) => id !== c.id))
                          }}
                        />
                        <span>{c.name || c.email}</span>
                        <span className="text-muted-foreground text-xs ml-auto">{c.email}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {generating ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Statement Dialog (shown when email-suppression feature is enabled) */}
      <Dialog open={approveTarget !== null} onOpenChange={(o) => { if (!o) setApproveTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Statement</DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Approve the {MONTH_NAMES[new Date(approveTarget.periodStart).getUTCMonth()]}{" "}
                {new Date(approveTarget.periodStart).getUTCFullYear()} statement for{" "}
                <span className="font-medium text-foreground">
                  {approveTarget.user.name || approveTarget.user.email}
                </span>.
              </p>

              <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="approve-send-email" className="cursor-pointer">
                    Send email notification to client
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {approveSendEmail
                      ? "The client will receive an email with a link to view the statement."
                      : "No email will be sent. The statement is still approved and available in the client portal."}
                  </p>
                </div>
                <Switch
                  id="approve-send-email"
                  checked={approveSendEmail}
                  onCheckedChange={setApproveSendEmail}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={approving}>
              Cancel
            </Button>
            <Button
              onClick={() => approveTarget && handleApprove(approveTarget.id, approveSendEmail)}
              disabled={approving}
            >
              {approving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {approveSendEmail ? "Approve & Send" : "Approve (No Email)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

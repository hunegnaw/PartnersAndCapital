"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export default function AdminStatementsPage() {
  const [statements, setStatements] = useState<StatementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
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

  const limit = 50

  const fetchStatements = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (statusFilter !== "ALL") params.set("status", statusFilter)
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
  }, [page, statusFilter])

  useEffect(() => {
    Promise.resolve().then(fetchStatements)
  }, [fetchStatements])

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/admin/clients?limit=1000")
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

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/admin/statements/${id}/approve`, { method: "PATCH" })
      if (!res.ok) throw new Error("Failed to approve")
      await fetchStatements()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed")
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason (optional):")
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

  const totalPages = Math.ceil(total / limit)

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
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Total Invested</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Generated</th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Approved By</th>
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
                              <Button variant="ghost" size="sm" onClick={() => handleApprove(s.id)} title="Approve">
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
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
                    {[2024, 2025, 2026, 2027].map((y) => (
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
    </div>
  )
}

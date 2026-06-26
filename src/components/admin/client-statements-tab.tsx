"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  FileText,
  Eye,
  RefreshCw,
  Check,
  X,
  Plus,
} from "lucide-react"
import { formatCurrency, formatDateOnly, statementYearOptions } from "@/lib/utils"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const STATUS_COLORS: Record<string, string> = {
  GENERATED: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SENT: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

interface Statement {
  id: string
  statementDate: string
  periodStart: string
  status: string
  totalInvested: number
  generatedAt: string
  approvedAt: string | null
  sentAt: string | null
}

export function ClientStatementsTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1)
  const [genYear, setGenYear] = useState(new Date().getFullYear())
  const [genMonthToDate, setGenMonthToDate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatements = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/statements?clientId=${clientId}&limit=100`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      setStatements(data.statements)
    } catch {
      setError("Failed to load statements")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { Promise.resolve().then(fetchStatements) }, [fetchStatements])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/statements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: genMonth,
          year: genYear,
          clientIds: [clientId],
          monthToDate: genMonthToDate,
        }),
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
    } catch {}
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/admin/statements/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Failed to reject")
      await fetchStatements()
    } catch {}
  }

  async function handleRegenerate(id: string) {
    try {
      const res = await fetch(`/api/admin/statements/${id}/regenerate`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")
      await fetchStatements()
    } catch {}
  }

  if (loading) {
    return <Card><CardContent className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-medium">Statements for {clientName}</CardTitle>
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Generate Statement
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="px-4 py-2 text-sm text-red-600">{error}</div>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Total Invested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No statements generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                statements.map((s) => {
                  const period = new Date(s.periodStart)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {MONTH_NAMES[period.getMonth()]} {period.getFullYear()}
                      </TableCell>
                      <TableCell>{formatCurrency(s.totalInvested)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[s.status] || "bg-gray-100"}`}>
                          {s.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDateOnly(s.generatedAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{s.sentAt ? formatDateOnly(s.sentAt) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => window.open(`/api/admin/statements/${s.id}/preview`, "_blank")} title="Preview">
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
                          <Button variant="ghost" size="sm" onClick={() => handleRegenerate(s.id)} title="Regenerate">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Statement for {clientName}</DialogTitle>
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={genMonthToDate} onChange={(e) => setGenMonthToDate(e.target.checked)} />
              Month-to-date (use today as end date)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

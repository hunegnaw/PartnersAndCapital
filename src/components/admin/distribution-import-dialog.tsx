"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2, Upload, DollarSign, AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DistributionImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  onSuccess: () => void
}

interface PreviewRow {
  email: string
  amount: number
  date: string
  description: string
  matched: boolean
  clientName?: string
  clientInvestmentId?: string
  error?: string
}

export function DistributionImportDialog({
  open,
  onOpenChange,
  investmentId,
  onSuccess,
}: DistributionImportDialogProps) {
  const [tab, setTab] = useState("csv")

  // CSV state
  const [csvText, setCsvText] = useState("")
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: string[]; errors: string[] } | null>(null)

  // Preview state
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null)
  const [positions, setPositions] = useState<Array<{ id: string; userId: string; userEmail: string; userName: string }>>([])

  // Pro-rata state
  const [totalAmount, setTotalAmount] = useState("")
  const [proRataDate, setProRataDate] = useState("")
  const [proRataDescription, setProRataDescription] = useState("")
  const [proRataLoading, setProRataLoading] = useState(false)
  const [proRataError, setProRataError] = useState<string | null>(null)
  const [proRataResult, setProRataResult] = useState<{ created: number; totalAllocated: number } | null>(null)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setCsvText("")
        setCsvError(null)
        setCsvResult(null)
        setPreviewRows(null)
        setTotalAmount("")
        setProRataDate("")
        setProRataDescription("")
        setProRataError(null)
        setProRataResult(null)
      })
      // Fetch positions for client matching
      fetch(`/api/admin/investments/${investmentId}/clients`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPositions(
              data.map((p: { id: string; userId: string; user: { email: string; name: string } }) => ({
                id: p.id,
                userId: p.userId,
                userEmail: p.user.email.toLowerCase(),
                userName: p.user.name || p.user.email,
              }))
            )
          }
        })
        .catch(() => {})
    }
  }, [open, investmentId])

  function parseMmDdYyyy(dateStr: string): string | null {
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (!match) return null
    const [, mm, dd, yyyy] = match
    const m = parseInt(mm, 10)
    const d = parseInt(dd, 10)
    const y = parseInt(yyyy, 10)
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`
  }

  function parseCsvLine(line: string): string[] {
    const fields: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ",") {
          fields.push(current.trim())
          current = ""
        } else {
          current += ch
        }
      }
    }
    fields.push(current.trim())
    return fields
  }

  function parseCsv(text: string) {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) return []

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())

    const emailIdx = headers.findIndex((h) => h === "email" || h === "client email")
    const amountIdx = headers.findIndex((h) => h === "amount" || h === "distribution amount" || h === "distribution_amount")
    const dateIdx = headers.findIndex((h) => h === "date" || h === "payment date" || h === "payment_date")
    const notesIdx = headers.findIndex((h) => h === "notes" || h === "description")

    if (emailIdx === -1 || amountIdx === -1 || dateIdx === -1) {
      return null
    }

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (cols.length <= 1 && !cols[0]) continue
      rows.push({
        email: cols[emailIdx] || "",
        amount: cols[amountIdx] || "",
        date: cols[dateIdx] || "",
        description: notesIdx !== -1 ? cols[notesIdx] || "" : "",
      })
    }
    return rows
  }

  function handlePreview() {
    setCsvError(null)
    setCsvResult(null)

    const rows = parseCsv(csvText)
    if (rows === null) {
      setCsvError("CSV must have headers: Email, Amount, Date (Notes optional)")
      return
    }
    if (rows.length === 0) {
      setCsvError("No data rows found in CSV")
      return
    }

    const positionByEmail = new Map(positions.map((p) => [p.userEmail, p]))

    const preview: PreviewRow[] = rows.map((row) => {
      const amt = parseFloat(row.amount.replace(/[$,]/g, ""))
      const isoDate = parseMmDdYyyy(row.date)
      const position = positionByEmail.get(row.email.toLowerCase())

      if (!row.email) {
        return { email: row.email, amount: 0, date: row.date, description: row.description, matched: false, error: "Missing email" }
      }
      if (isNaN(amt) || amt <= 0) {
        return { email: row.email, amount: 0, date: row.date, description: row.description, matched: false, error: "Invalid amount" }
      }
      if (!isoDate) {
        return { email: row.email, amount: amt, date: row.date, description: row.description, matched: false, error: "Invalid date (use MM/DD/YYYY)" }
      }
      if (!position) {
        return { email: row.email, amount: amt, date: isoDate, description: row.description, matched: false, error: "No position in this investment" }
      }

      return {
        email: row.email,
        amount: amt,
        date: isoDate,
        description: row.description,
        matched: true,
        clientName: position.userName,
        clientInvestmentId: position.id,
      }
    })

    setPreviewRows(preview)
  }

  async function handleCsvSubmit() {
    if (!previewRows) return
    setCsvError(null)
    setCsvResult(null)

    const validRows = previewRows.filter((r) => r.matched)
    if (validRows.length === 0) {
      setCsvError("No valid rows to import")
      return
    }

    setCsvLoading(true)
    try {
      const res = await fetch(`/api/admin/investments/${investmentId}/distributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "csv",
          silent: true,
          rows: validRows.map((r) => ({
            email: r.email,
            amount: r.amount,
            date: r.date,
            description: r.description || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      setCsvResult(data)
      setPreviewRows(null)
      if (data.created > 0) onSuccess()
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setCsvLoading(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewRows(null)
    setCsvResult(null)
    setCsvError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) || "")
    }
    reader.readAsText(file)
  }

  async function handleProRataSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProRataError(null)
    setProRataResult(null)

    const num = parseFloat(totalAmount)
    if (isNaN(num) || num <= 0) {
      setProRataError("Total amount must be a positive number")
      return
    }
    if (!proRataDate) {
      setProRataError("Date is required")
      return
    }

    setProRataLoading(true)
    try {
      const res = await fetch(`/api/admin/investments/${investmentId}/distributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "prorate",
          totalAmount: num,
          date: proRataDate,
          description: proRataDescription || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Allocation failed")
      setProRataResult(data)
      onSuccess()
    } catch (err) {
      setProRataError(err instanceof Error ? err.message : "Allocation failed")
    } finally {
      setProRataLoading(false)
    }
  }

  const matchedCount = previewRows?.filter((r) => r.matched).length ?? 0
  const skippedCount = previewRows?.filter((r) => !r.matched).length ?? 0
  const totalImportAmount = previewRows?.filter((r) => r.matched).reduce((sum, r) => sum + r.amount, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Distribution</DialogTitle>
          <DialogDescription>
            Import distributions from CSV or allocate a total amount pro-rata across all positions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="csv" className="flex-1">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="prorate" className="flex-1">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />
              Pro-Rata
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv">
            <div className="space-y-4">
              {csvError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {csvError}
                </div>
              )}

              {csvResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <p className="font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    {csvResult.created} distribution(s) created
                  </p>
                  {csvResult.skipped.length > 0 && (
                    <ul className="mt-1 text-xs">
                      {csvResult.skipped.map((s, i) => <li key={i}>Skipped: {s}</li>)}
                    </ul>
                  )}
                  {csvResult.errors.length > 0 && (
                    <ul className="mt-1 text-xs text-amber-700">
                      {csvResult.errors.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {!previewRows && !csvResult && (
                <>
                  <div className="grid gap-2">
                    <Label>Upload CSV File</Label>
                    <Input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                    />
                    <p className="text-xs text-muted-foreground">
                      Required columns: Email, Amount, Date (MM/DD/YYYY). Optional: Notes
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Or paste CSV data</Label>
                    <Textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder={"Email,Amount,Date,Notes\njohn@example.com,5000,06/15/2026,Q2 distribution"}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                    <Button onClick={handlePreview} disabled={!csvText.trim()}>
                      Preview Import
                    </Button>
                  </DialogFooter>
                </>
              )}

              {previewRows && !csvResult && (
                <>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {matchedCount} matched
                    </span>
                    {skippedCount > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        {skippedCount} will be skipped
                      </span>
                    )}
                    <span className="ml-auto font-medium">
                      Total: ${totalImportAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, i) => (
                          <TableRow key={i} className={!row.matched ? "bg-amber-50/50" : ""}>
                            <TableCell>
                              {row.matched ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {row.matched ? row.clientName : (
                                <span className="text-amber-600 text-xs">{row.error}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{row.email}</TableCell>
                            <TableCell className="text-right font-medium">
                              {row.amount > 0
                                ? `$${row.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                                : "--"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {row.matched ? new Date(row.date + "T12:00:00").toLocaleDateString("en-US") : row.date}
                            </TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{row.description || "--"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setPreviewRows(null)} disabled={csvLoading}>
                      Back
                    </Button>
                    <Button onClick={handleCsvSubmit} disabled={csvLoading || matchedCount === 0}>
                      {csvLoading && <Loader2 className="animate-spin" />}
                      Import {matchedCount} Distribution{matchedCount !== 1 ? "s" : ""}
                    </Button>
                  </DialogFooter>
                </>
              )}

              {csvResult && (
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </DialogFooter>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prorate">
            <form onSubmit={handleProRataSubmit} className="space-y-4">
              {proRataError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {proRataError}
                </div>
              )}

              {proRataResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <p className="font-medium">
                    Allocated ${proRataResult.totalAllocated.toLocaleString("en-US", { minimumFractionDigits: 2 })} across {proRataResult.created} position(s)
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Total Distribution Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="e.g. 50000.00"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This total will be split across all active positions proportional to their invested capital.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Date *</Label>
                <DatePicker
                  value={proRataDate}
                  onChange={setProRataDate}
                  placeholder="Select distribution date"
                />
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={proRataDescription}
                  onChange={(e) => setProRataDescription(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={proRataLoading}>
                  Close
                </Button>
                <Button type="submit" disabled={proRataLoading}>
                  {proRataLoading && <Loader2 className="animate-spin" />}
                  Allocate Pro-Rata
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

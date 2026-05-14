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
import { Loader2, Upload, DollarSign } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

interface DistributionImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  onSuccess: () => void
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
        setTotalAmount("")
        setProRataDate("")
        setProRataDescription("")
        setProRataError(null)
        setProRataResult(null)
      })
    }
  }, [open])

  function parseCsv(text: string) {
    const lines = text.trim().split("\n")
    if (lines.length < 2) return []

    const headerLine = lines[0].toLowerCase()
    const headers = headerLine.split(",").map((h) => h.trim())

    const emailIdx = headers.findIndex((h) => h === "email" || h === "client email")
    const amountIdx = headers.findIndex((h) => h === "amount" || h === "distribution amount" || h === "distribution_amount")
    const dateIdx = headers.findIndex((h) => h === "date" || h === "payment date" || h === "payment_date")
    const notesIdx = headers.findIndex((h) => h === "notes" || h === "description")

    if (emailIdx === -1 || amountIdx === -1 || dateIdx === -1) {
      return null // invalid headers
    }

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim())
      if (cols.length <= 1 && !cols[0]) continue // skip empty lines
      rows.push({
        email: cols[emailIdx] || "",
        amount: cols[amountIdx] || "",
        date: cols[dateIdx] || "",
        description: notesIdx !== -1 ? cols[notesIdx] || "" : "",
      })
    }
    return rows
  }

  async function handleCsvSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCsvError(null)
    setCsvResult(null)

    const rows = parseCsv(csvText)
    if (rows === null) {
      setCsvError("CSV must have headers: email, amount, date (notes optional)")
      return
    }
    if (rows.length === 0) {
      setCsvError("No data rows found in CSV")
      return
    }

    setCsvLoading(true)
    try {
      const res = await fetch(`/api/admin/investments/${investmentId}/distributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "csv", rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      setCsvResult(data)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
            <form onSubmit={handleCsvSubmit} className="space-y-4">
              {csvError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {csvError}
                </div>
              )}

              {csvResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <p className="font-medium">{csvResult.created} distribution(s) created</p>
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

              <div className="grid gap-2">
                <Label>Upload CSV File</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground">
                  Required columns: email, amount, date. Optional: notes
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Or paste CSV data</Label>
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={"email,amount,date,notes\njohn@example.com,5000,2025-06-01,Monthly distribution"}
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={csvLoading}>
                  Close
                </Button>
                <Button type="submit" disabled={csvLoading || !csvText.trim()}>
                  {csvLoading && <Loader2 className="animate-spin" />}
                  Import
                </Button>
              </DialogFooter>
            </form>
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

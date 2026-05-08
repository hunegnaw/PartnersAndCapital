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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2 } from "lucide-react"

interface ValuationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  onSuccess: () => void
  existing?: {
    id: string
    date: string
    totalValue: number | string
    notes: string | null
  }
}

export function ValuationFormDialog({
  open,
  onOpenChange,
  investmentId,
  onSuccess,
  existing,
}: ValuationFormDialogProps) {
  const [date, setDate] = useState("")
  const [totalValue, setTotalValue] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        if (existing) {
          setDate(existing.date.slice(0, 10))
          setTotalValue(String(Number(existing.totalValue)))
          setNotes(existing.notes || "")
        } else {
          setDate("")
          setTotalValue("")
          setNotes("")
        }
        setError(null)
      })
    }
  }, [open, existing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!date || !totalValue) {
      setError("Date and total fund value are required")
      return
    }

    const numValue = parseFloat(totalValue)
    if (isNaN(numValue) || numValue < 0) {
      setError("Total fund value must be a valid positive number")
      return
    }

    setLoading(true)

    try {
      const url = existing
        ? `/api/admin/investments/${investmentId}/valuations/${existing.id}`
        : `/api/admin/investments/${investmentId}/valuations`

      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          totalValue: numValue,
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save valuation")
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {existing ? "Edit Valuation" : "Add Valuation"}
            </DialogTitle>
            <DialogDescription>
              {existing
                ? "Update the fund valuation. Client positions will be recalculated."
                : "Enter the total fund value as of a specific date. All client positions will be updated proportionally."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="valuation-date">Date *</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Select valuation date"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valuation-value">Total Fund Value *</Label>
              <Input
                id="valuation-value"
                type="number"
                step="0.01"
                min="0"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="e.g. 10000000"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valuation-notes">Notes</Label>
              <Textarea
                id="valuation-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this valuation..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {existing ? "Update Valuation" : "Add Valuation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

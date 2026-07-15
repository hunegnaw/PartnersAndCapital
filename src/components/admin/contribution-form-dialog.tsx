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

interface ContributionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  clientInvestmentId: string
  clientName: string
  onSuccess: () => void
}

export function ContributionFormDialog({
  open,
  onOpenChange,
  investmentId,
  clientInvestmentId,
  clientName,
  onSuccess,
}: ContributionFormDialogProps) {
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setAmount("")
        setDate("")
        setDescription("")
        setError(null)
      })
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!amount || !date) {
      setError("Amount and date are required")
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Amount must be a positive number")
      return
    }

    setLoading(true)

    try {
      const res = await fetch(
        `/api/admin/investments/${investmentId}/clients/${clientInvestmentId}/contributions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numAmount,
            date,
            description: description || null,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to add contribution")
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
            <DialogTitle>Add Contribution</DialogTitle>
            <DialogDescription>
              Record a capital contribution for {clientName}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="contrib-amount">Amount *</Label>
              <Input
                id="contrib-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contrib-date">Contribution Date *</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Select contribution date"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contrib-description">Notes</Label>
              <Textarea
                id="contrib-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this contribution..."
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
              Add Contribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

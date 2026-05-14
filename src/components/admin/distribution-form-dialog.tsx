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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface DistributionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  clientInvestmentId: string
  clientName: string
  onSuccess: () => void
}

export function DistributionFormDialog({
  open,
  onOpenChange,
  investmentId,
  clientInvestmentId,
  clientName,
  onSuccess,
}: DistributionFormDialogProps) {
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [type, setType] = useState("CASH")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setAmount("")
        setDate("")
        setType("CASH")
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
        `/api/admin/investments/${investmentId}/clients/${clientInvestmentId}/distributions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numAmount,
            date,
            type,
            description: description || null,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create distribution")
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
            <DialogTitle>Record Distribution</DialogTitle>
            <DialogDescription>
              Record a distribution payment for {clientName}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="dist-amount">Amount *</Label>
              <Input
                id="dist-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dist-date">Payment Date *</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Select payment date"
              />
            </div>

            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "CASH")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash Distribution</SelectItem>
                  <SelectItem value="REINVESTMENT">Reinvestment</SelectItem>
                  <SelectItem value="RETURN_OF_CAPITAL">Return of Capital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dist-description">Notes</Label>
              <Textarea
                id="dist-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes about this distribution..."
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
              Record Distribution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

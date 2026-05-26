"use client"

import { useState } from "react"
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

interface EditContributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contribution: {
    id: string
    amount: number | string
    date: string
    description: string | null
    status: string
  } | null
  onSuccess: () => void
}

export function EditContributionDialog({
  open,
  onOpenChange,
  contribution,
  onSuccess,
}: EditContributionDialogProps) {
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("COMPLETED")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)

  // Sync form state from props when dialog opens (React recommended pattern)
  if (open && !prevOpen && contribution) {
    setPrevOpen(true)
    setAmount(String(contribution.amount))
    const d = new Date(contribution.date)
    setDate(d.toISOString().slice(0, 10))
    setTime(d.toTimeString().slice(0, 5))
    setDescription(contribution.description || "")
    setStatus(contribution.status)
    setError(null)
  }
  if (!open && prevOpen) {
    setPrevOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contribution) return
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
      const dateTime = time
        ? new Date(`${date}T${time}:00`).toISOString()
        : new Date(`${date}T12:00:00`).toISOString()

      const res = await fetch(`/api/admin/contributions/${contribution.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          date: dateTime,
          description: description || null,
          status,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update contribution")
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Contribution</DialogTitle>
            <DialogDescription>
              Update the contribution record details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-contrib-amount">Amount *</Label>
              <Input
                id="edit-contrib-amount"
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
              <Label>Date *</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Select date"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-contrib-time">Time</Label>
              <Input
                id="edit-contrib-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? "COMPLETED")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-contrib-description">Notes</Label>
              <Textarea
                id="edit-contrib-description"
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

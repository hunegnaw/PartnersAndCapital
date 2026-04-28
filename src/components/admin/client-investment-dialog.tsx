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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface ClientOption {
  id: string
  name: string
  email: string
}

interface ClientInvestmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  clients: ClientOption[]
  onSuccess: () => void
}

export function ClientInvestmentDialog({
  open,
  onOpenChange,
  investmentId,
  clients,
  onSuccess,
}: ClientInvestmentDialogProps) {
  const [clientId, setClientId] = useState("")
  const [amountInvested, setAmountInvested] = useState("")
  const [investmentDate, setInvestmentDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setClientId("")
        setAmountInvested("")
        setInvestmentDate("")
        setError(null)
      })
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        clientId,
        amountInvested: parseFloat(amountInvested),
      }
      if (investmentDate) body.investmentDate = investmentDate

      const res = await fetch(
        `/api/admin/investments/${investmentId}/clients`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to add client to investment")
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
            <DialogTitle>Add Client to Investment</DialogTitle>
            <DialogDescription>
              Assign a client to this investment with their initial commitment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ci-amount">Amount Invested ($) *</Label>
              <Input
                id="ci-amount"
                type="number"
                step="0.01"
                min="0"
                value={amountInvested}
                onChange={(e) => setAmountInvested(e.target.value)}
                placeholder="100000.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Investment Date</Label>
              <DatePicker
                value={investmentDate}
                onChange={setInvestmentDate}
                placeholder="Select date"
                clearable
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
              Add Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

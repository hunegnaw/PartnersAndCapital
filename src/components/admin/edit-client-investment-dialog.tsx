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

interface EditClientInvestmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentId: string
  position: {
    id: string
    amountInvested: number
    currentValue: number
    cashDistributed: number
    adminApr: number | null
    irr: number | null
    investmentDate: string
    user: { name: string; email: string }
  } | null
  onSuccess: () => void
}

export function EditClientInvestmentDialog({
  open,
  onOpenChange,
  investmentId,
  position,
  onSuccess,
}: EditClientInvestmentDialogProps) {
  const [amountInvested, setAmountInvested] = useState("")
  const [currentValue, setCurrentValue] = useState("")
  const [adminApr, setAdminApr] = useState("")
  const [irr, setIrr] = useState("")
  const [investmentDate, setInvestmentDate] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && position) {
      Promise.resolve().then(() => {
        setAmountInvested(String(position.amountInvested))
        setCurrentValue(String(position.currentValue))
        setAdminApr(position.adminApr != null ? String(position.adminApr) : "")
        setIrr(position.irr != null ? String(position.irr) : "")
        setInvestmentDate(
          position.investmentDate
            ? position.investmentDate.slice(0, 10)
            : ""
        )
        setStatus("ACTIVE")
        setError(null)
      })
    }
  }, [open, position])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!position) return
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        amountInvested: parseFloat(amountInvested),
        currentValue: parseFloat(currentValue),
        status,
      }
      if (adminApr) body.adminApr = parseFloat(adminApr)
      if (irr) body.irr = parseFloat(irr)
      else body.irr = null
      if (investmentDate) body.investmentDate = investmentDate

      const res = await fetch(
        `/api/admin/investments/${investmentId}/clients/${position.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update position")
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
            <DialogTitle>Edit Client Position</DialogTitle>
            <DialogDescription>
              Update {position?.user.name || position?.user.email}&apos;s position in this investment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="eci-amount">Amount Invested ($) *</Label>
              <Input
                id="eci-amount"
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
              <Label htmlFor="eci-value">Current Value ($) *</Label>
              <Input
                id="eci-value"
                type="number"
                step="0.01"
                min="0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="105000.00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="eci-apr">APR (%)</Label>
              <Input
                id="eci-apr"
                type="number"
                step="0.01"
                value={adminApr}
                onChange={(e) => setAdminApr(e.target.value)}
                placeholder="8.50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="eci-irr">IRR (%)</Label>
              <Input
                id="eci-irr"
                type="number"
                step="0.0001"
                value={irr}
                onChange={(e) => setIrr(e.target.value)}
                placeholder="0.1250"
              />
              <p className="text-xs text-muted-foreground">Decimal format (e.g. 0.12 = 12%). Used for Avg Net Return on homepage.</p>
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

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? "ACTIVE")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="EXITED">Exited</SelectItem>
                </SelectContent>
              </Select>
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

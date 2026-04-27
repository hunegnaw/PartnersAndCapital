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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface AssetClassOption {
  id: string
  name: string
}

interface InvestmentFormData {
  id: string
  name: string
  description?: string | null
  assetClassId: string
  status: string
  targetReturn?: string | number | null
  minimumInvestment?: string | number | null
  vintage?: number | null
  startDate?: string | null
  endDate?: string | null
  location?: string | null
  targetHoldPeriod?: string | null
  distributionCadence?: string | null
  fundStatus?: string | null
}

interface InvestmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment?: InvestmentFormData
  assetClasses: AssetClassOption[]
  onSuccess: () => void
}

const INVESTMENT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "CLOSED", label: "Closed" },
  { value: "FULLY_REALIZED", label: "Fully Realized" },
]

export function InvestmentFormDialog({
  open,
  onOpenChange,
  investment,
  assetClasses,
  onSuccess,
}: InvestmentFormDialogProps) {
  const isEdit = !!investment

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [assetClassId, setAssetClassId] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [targetReturn, setTargetReturn] = useState("")
  const [minimumInvestment, setMinimumInvestment] = useState("")
  const [vintage, setVintage] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [location, setLocation] = useState("")
  const [targetHoldPeriod, setTargetHoldPeriod] = useState("")
  const [distributionCadence, setDistributionCadence] = useState("")
  const [fundStatus, setFundStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setName(investment?.name ?? "")
        setDescription(investment?.description ?? "")
        setAssetClassId(investment?.assetClassId ?? "")
        setStatus(investment?.status ?? "ACTIVE")
        setTargetReturn(investment?.targetReturn?.toString() ?? "")
        setMinimumInvestment(investment?.minimumInvestment?.toString() ?? "")
        setVintage(investment?.vintage?.toString() ?? "")
        setStartDate(investment?.startDate ? investment.startDate.slice(0, 10) : "")
        setEndDate(investment?.endDate ? investment.endDate.slice(0, 10) : "")
        setLocation(investment?.location ?? "")
        setTargetHoldPeriod(investment?.targetHoldPeriod ?? "")
        setDistributionCadence(investment?.distributionCadence ?? "")
        setFundStatus(investment?.fundStatus ?? "")
        setError(null)
      })
    }
  }, [open, investment])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        name,
        assetClassId,
        status,
      }
      if (description) body.description = description
      if (targetReturn) body.targetReturn = parseFloat(targetReturn)
      if (minimumInvestment) body.minimumInvestment = parseFloat(minimumInvestment)
      if (vintage) body.vintage = parseInt(vintage, 10)
      if (startDate) body.startDate = startDate
      if (endDate) body.endDate = endDate
      if (location) body.location = location
      if (targetHoldPeriod) body.targetHoldPeriod = targetHoldPeriod
      if (distributionCadence) body.distributionCadence = distributionCadence
      if (fundStatus) body.fundStatus = fundStatus

      const url = isEdit
        ? `/api/admin/investments/${investment.id}`
        : "/api/admin/investments"

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error || `Failed to ${isEdit ? "update" : "create"} investment`
        )
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Investment" : "Add Investment"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the investment details."
                : "Create a new investment offering."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="inv-name">Name *</Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fund Name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inv-description">Description</Label>
              <Textarea
                id="inv-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the investment..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Asset Class *</Label>
                <Select
                  value={assetClassId}
                  onValueChange={(v) => setAssetClassId(v ?? "")}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetClasses.map((ac) => (
                      <SelectItem key={ac.id} value={ac.id}>
                        {ac.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Status *</Label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "ACTIVE")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inv-target-return">Target Return (%)</Label>
                <Input
                  id="inv-target-return"
                  type="number"
                  step="0.01"
                  value={targetReturn}
                  onChange={(e) => setTargetReturn(e.target.value)}
                  placeholder="8.00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inv-min-invest">Minimum Investment ($)</Label>
                <Input
                  id="inv-min-invest"
                  type="number"
                  step="0.01"
                  value={minimumInvestment}
                  onChange={(e) => setMinimumInvestment(e.target.value)}
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inv-vintage">Vintage (Year)</Label>
                <Input
                  id="inv-vintage"
                  type="number"
                  min="1990"
                  max="2099"
                  value={vintage}
                  onChange={(e) => setVintage(e.target.value)}
                  placeholder="2024"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inv-location">Location</Label>
                <Input
                  id="inv-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="New York, NY"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inv-start-date">Start Date</Label>
                <Input
                  id="inv-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inv-end-date">End Date</Label>
                <Input
                  id="inv-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inv-hold-period">Target Hold Period</Label>
                <Input
                  id="inv-hold-period"
                  value={targetHoldPeriod}
                  onChange={(e) => setTargetHoldPeriod(e.target.value)}
                  placeholder="5-7 years"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inv-dist-cadence">Distribution Cadence</Label>
                <Input
                  id="inv-dist-cadence"
                  value={distributionCadence}
                  onChange={(e) => setDistributionCadence(e.target.value)}
                  placeholder="Quarterly"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inv-fund-status">Fund Status</Label>
              <Input
                id="inv-fund-status"
                value={fundStatus}
                onChange={(e) => setFundStatus(e.target.value)}
                placeholder="Open for investment"
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
              {isEdit ? "Save Changes" : "Create Investment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

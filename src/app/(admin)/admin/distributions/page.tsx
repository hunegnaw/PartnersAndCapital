"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency, formatDateOnly } from "@/lib/utils"
import { EditDistributionDialog } from "@/components/admin/edit-distribution-dialog"
import {
  Search,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
} from "lucide-react"

interface DistributionUser {
  id: string
  name: string | null
  email: string
}

interface DistributionInvestment {
  id: string
  name: string
}

interface DistributionClientInvestment {
  id: string
  investmentId: string
  investment: DistributionInvestment
}

interface Distribution {
  id: string
  amount: string | number
  date: string
  type: string
  description: string | null
  status: string
  user: DistributionUser
  clientInvestment: DistributionClientInvestment
}

interface InvestmentOption {
  id: string
  name: string
}

interface ClientInvestmentOption {
  id: string
  investmentId: string
  amountInvested: string | number
  user: { id: string; name: string | null; email: string }
  investment: { id: string; name: string }
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "CASH", label: "Cash" },
  { value: "REINVESTMENT", label: "Reinvestment" },
  { value: "RETURN_OF_CAPITAL", label: "Return of Capital" },
]

const TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  REINVESTMENT: "Reinvestment",
  RETURN_OF_CAPITAL: "Return of Capital",
}

const statusVariant = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "default" as const
    case "PENDING":
      return "secondary" as const
    case "CANCELLED":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

export default function AdminDistributionsPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [investments, setInvestments] = useState<InvestmentOption[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [investmentFilter, setInvestmentFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStep, setDialogStep] = useState<1 | 2>(1)
  const [clientSearch, setClientSearch] = useState("")
  const [clientSearchResults, setClientSearchResults] = useState<ClientInvestmentOption[]>([])
  const [clientSearchLoading, setClientSearchLoading] = useState(false)
  const [selectedClientInvestment, setSelectedClientInvestment] = useState<ClientInvestmentOption | null>(null)

  // Distribution form fields
  const [distAmount, setDistAmount] = useState("")
  const [distDate, setDistDate] = useState("")
  const [distType, setDistType] = useState("CASH")
  const [distDescription, setDistDescription] = useState("")
  const [distLoading, setDistLoading] = useState(false)
  const [distError, setDistError] = useState<string | null>(null)

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Distribution | null>(null)

  const fetchDistributions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.set("search", search)
      if (typeFilter) params.set("type", typeFilter)
      if (investmentFilter) params.set("investmentId", investmentFilter)

      const res = await fetch(`/api/admin/distributions?${params}`)
      if (!res.ok) throw new Error("Failed to fetch distributions")
      const data = await res.json()
      setDistributions(data.distributions)
      setTotal(data.total)
      setInvestments(data.investments)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, typeFilter, investmentFilter])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDistributions()
    })
  }, [fetchDistributions])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchDistributions()
  }

  // Client investment search for the dialog
  async function searchClientInvestments(query: string) {
    setClientSearch(query)
    if (query.length < 2) {
      setClientSearchResults([])
      return
    }
    setClientSearchLoading(true)
    try {
      const params = new URLSearchParams({ search: query, pageSize: "20" })
      const res = await fetch(`/api/admin/client-investments?${params}`)
      if (!res.ok) throw new Error("Search failed")
      const data = await res.json()
      setClientSearchResults(data.clientInvestments || [])
    } catch {
      setClientSearchResults([])
    } finally {
      setClientSearchLoading(false)
    }
  }

  function openDialog() {
    setDialogStep(1)
    setClientSearch("")
    setClientSearchResults([])
    setSelectedClientInvestment(null)
    setDistAmount("")
    setDistDate("")
    setDistType("CASH")
    setDistDescription("")
    setDistError(null)
    setDialogOpen(true)
  }

  function selectClientInvestment(ci: ClientInvestmentOption) {
    setSelectedClientInvestment(ci)
    setDialogStep(2)
    setDistError(null)
  }

  async function handleRecordDistribution(e: React.FormEvent) {
    e.preventDefault()
    setDistError(null)

    if (!selectedClientInvestment) return
    if (!distAmount || !distDate) {
      setDistError("Amount and date are required")
      return
    }

    const numAmount = parseFloat(distAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setDistError("Amount must be a positive number")
      return
    }

    setDistLoading(true)
    try {
      const res = await fetch(
        `/api/admin/investments/${selectedClientInvestment.investmentId}/clients/${selectedClientInvestment.id}/distributions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numAmount,
            date: distDate,
            type: distType,
            description: distDescription || null,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create distribution")
      }

      setDialogOpen(false)
      fetchDistributions()
    } catch (err) {
      setDistError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setDistLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Distributions</h1>
          <p className="text-muted-foreground mt-1">
            View and manage distribution payments across all investments.
          </p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="h-4 w-4" />
          Record Distribution
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client or investment name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        <Select
          value={typeFilter}
          onValueChange={(val) => {
            setTypeFilter(val === "all" ? "" : (val ?? ""))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={investmentFilter}
          onValueChange={(val) => {
            setInvestmentFilter(val === "all" ? "" : (val ?? ""))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Investment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Investments</SelectItem>
            {investments.map((inv) => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} distribution${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Investment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : distributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {search || typeFilter || investmentFilter
                      ? "No distributions match your filters."
                      : "No distributions yet. Record your first distribution to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                distributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateOnly(dist.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {dist.user.name || dist.user.email}
                    </TableCell>
                    <TableCell>
                      {dist.clientInvestment.investment.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(dist.amount))}
                    </TableCell>
                    <TableCell>
                      {TYPE_LABELS[dist.type] || dist.type}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                      {dist.description || "--"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(dist.status)}>
                        {dist.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditTarget(dist)
                          setEditOpen(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}--{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Distribution Dialog */}
      <EditDistributionDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditTarget(null)
        }}
        distribution={editTarget}
        onSuccess={fetchDistributions}
      />

      {/* Record Distribution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {dialogStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>Record Distribution</DialogTitle>
                <DialogDescription>
                  Search for a client to record a distribution payment.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Search Client</Label>
                  <Input
                    placeholder="Type client name or email..."
                    value={clientSearch}
                    onChange={(e) => searchClientInvestments(e.target.value)}
                    autoFocus
                  />
                </div>
                {clientSearchLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {clientSearchResults.length > 0 && (
                  <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                    {clientSearchResults.map((ci) => (
                      <button
                        key={ci.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                        onClick={() => selectClientInvestment(ci)}
                      >
                        <div className="font-medium text-sm">
                          {ci.user.name || ci.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ci.investment.name} &middot; {formatCurrency(Number(ci.amountInvested))} invested
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {clientSearch.length >= 2 && !clientSearchLoading && clientSearchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No client positions found.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleRecordDistribution}>
              <DialogHeader>
                <DialogTitle>Record Distribution</DialogTitle>
                <DialogDescription>
                  {selectedClientInvestment && (
                    <>
                      For {selectedClientInvestment.user.name || selectedClientInvestment.user.email} &mdash; {selectedClientInvestment.investment.name}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {distError && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {distError}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="new-dist-amount">Amount *</Label>
                  <Input
                    id="new-dist-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={distAmount}
                    onChange={(e) => setDistAmount(e.target.value)}
                    placeholder="e.g. 5000.00"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-dist-date">Payment Date *</Label>
                  <DatePicker
                    value={distDate}
                    onChange={setDistDate}
                    placeholder="Select payment date"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={distType} onValueChange={(v) => setDistType(v ?? "CASH")}>
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
                  <Label htmlFor="new-dist-description">Notes</Label>
                  <Textarea
                    id="new-dist-description"
                    value={distDescription}
                    onChange={(e) => setDistDescription(e.target.value)}
                    placeholder="Optional notes about this distribution..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogStep(1)}
                  disabled={distLoading}
                >
                  Back
                </Button>
                <Button type="submit" disabled={distLoading}>
                  {distLoading && <Loader2 className="animate-spin" />}
                  Record Distribution
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

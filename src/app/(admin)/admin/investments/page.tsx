"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { InvestmentFormDialog } from "@/components/admin/investment-form-dialog"
import { formatPercentage } from "@/lib/utils"
import {
  Search,
  Plus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface AssetClass {
  id: string
  name: string
}

interface Investment {
  id: string
  name: string
  description: string | null
  assetClassId: string
  status: string
  targetReturn: number | null
  minimumInvestment: number | null
  vintage: number | null
  startDate: string | null
  endDate: string | null
  location: string | null
  targetHoldPeriod: string | null
  distributionCadence: string | null
  fundStatus: string | null
  createdAt: string
  assetClass: AssetClass
  _count: {
    clientInvestments: number
  }
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "CLOSED", label: "Closed" },
  { value: "FULLY_REALIZED", label: "Fully Realized" },
]

const statusVariant = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return "default" as const
    case "PENDING":
      return "secondary" as const
    case "CLOSED":
      return "outline" as const
    case "FULLY_REALIZED":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

export default function AdminInvestmentsPage() {
  const router = useRouter()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [assetClassFilter, setAssetClassFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | undefined>(undefined)

  const fetchInvestments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (assetClassFilter) params.set("assetClassId", assetClassFilter)

      const res = await fetch(`/api/admin/investments?${params}`)
      if (!res.ok) throw new Error("Failed to fetch investments")
      const data = await res.json()
      setInvestments(data.investments)
      setTotal(data.total)

      // Extract unique asset classes from results for filter dropdown
      const seen = new Set<string>()
      const classes: AssetClass[] = []
      for (const inv of data.investments) {
        if (!seen.has(inv.assetClass.id)) {
          seen.add(inv.assetClass.id)
          classes.push(inv.assetClass)
        }
      }
      // Only update asset classes if we got results or this is the first load
      if (classes.length > 0 || assetClasses.length === 0) {
        setAssetClasses((prev) => {
          const merged = new Map<string, AssetClass>()
          for (const ac of prev) merged.set(ac.id, ac)
          for (const ac of classes) merged.set(ac.id, ac)
          return Array.from(merged.values())
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, assetClassFilter])

  useEffect(() => {
    fetchInvestments()
  }, [fetchInvestments])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchInvestments()
  }

  function handleAdd() {
    setEditingInvestment(undefined)
    setDialogOpen(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investments</h1>
          <p className="text-muted-foreground mt-1">
            Manage investment offerings and track performance.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Investment
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
              placeholder="Search investments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        <Select
          value={assetClassFilter}
          onValueChange={(val) => {
            setAssetClassFilter(val === "all" ? "" : (val ?? ""))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asset Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {assetClasses.map((ac) => (
              <SelectItem key={ac.id} value={ac.id}>
                {ac.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === "all" ? "" : (val ?? ""))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} investment${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Asset Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Clients</TableHead>
                <TableHead className="text-right">Target Return</TableHead>
                <TableHead className="hidden md:table-cell">Vintage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                  </TableRow>
                ))
              ) : investments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {search
                      ? "No investments match your search."
                      : "No investments yet. Add your first investment to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                investments.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/admin/investments/${inv.id}`)}
                  >
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell>{inv.assetClass.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {inv._count.clientInvestments}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.targetReturn != null ? formatPercentage(inv.targetReturn) : "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {inv.vintage ?? "--"}
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

      <InvestmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={editingInvestment}
        assetClasses={assetClasses}
        onSuccess={fetchInvestments}
      />
    </div>
  )
}

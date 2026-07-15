"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InvestmentFormDialog } from "@/components/admin/investment-form-dialog"
import { ClientInvestmentDialog } from "@/components/admin/client-investment-dialog"
import { EditClientInvestmentDialog } from "@/components/admin/edit-client-investment-dialog"
import { DealRoomUpdateDialog } from "@/components/admin/deal-room-update-dialog"
import { DocumentUploadDialog } from "@/components/admin/document-upload-dialog"
import { ValuationFormDialog } from "@/components/admin/valuation-form-dialog"
import { DistributionFormDialog } from "@/components/admin/distribution-form-dialog"
import { DistributionImportDialog } from "@/components/admin/distribution-import-dialog"
import { EditDistributionDialog } from "@/components/admin/edit-distribution-dialog"
import { EditContributionDialog } from "@/components/admin/edit-contribution-dialog"
import { ContributionFormDialog } from "@/components/admin/contribution-form-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatCurrency, formatDate, formatDateOnly, formatPercentage } from "@/lib/utils"
import {
  ResponsiveContainer,
  LineChart,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import {
  ArrowLeft,
  Pencil,
  Plus,
  AlertCircle,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Upload,
  TrendingUp,
  Trash2,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react"

interface DistributionRecord {
  id: string
  amount: number
  date: string
  type: string
  description: string | null
  status: string
  createdAt: string
}

interface ContributionRecord {
  id: string
  amount: number
  date: string
  description: string | null
  status: string
}

interface ClientPosition {
  id: string
  userId: string
  amountInvested: number
  currentValue: number
  cashDistributed: number
  adminApr: number | null
  irr: number | null
  investmentDate: string
  user: {
    id: string
    email: string
    name: string
    company: string | null
  }
  contributions: ContributionRecord[]
  distributions: DistributionRecord[]
}

interface DealRoomUpdate {
  id: string
  title: string
  content: string
  createdAt: string
}

interface InvestmentDocument {
  id: string
  name: string
  type: string
  fileName: string
  fileSize: number
  createdAt: string
  userId: string | null
  deletedAt: string | null
}

interface Valuation {
  id: string
  date: string
  totalValue: number | string
  notes: string | null
  createdAt: string
  createdBy: { id: string; name: string | null; email: string } | null
}

interface AssetClass {
  id: string
  name: string
}

interface InvestmentDetail {
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
  updatedAt: string
  assetClass: AssetClass
  clientInvestments: ClientPosition[]
  dealRoomUpdates: DealRoomUpdate[]
  documents: InvestmentDocument[]
}

type SortDir = "asc" | "desc"
type SortState<T extends string> = { key: T; dir: SortDir } | null

function toggleSort<T extends string>(current: SortState<T>, key: T): SortState<T> {
  if (current?.key === key) {
    return current.dir === "asc" ? { key, dir: "desc" } : null
  }
  return { key, dir: "asc" }
}

function SortableHead<T extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string
  sortKey: T
  sort: SortState<T>
  onSort: (s: SortState<T>) => void
  className?: string
}) {
  const active = sort?.key === sortKey
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(toggleSort(sort, sortKey))}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </TableHead>
  )
}

function sortItems<T>(items: T[], sort: SortState<string>, getters: Record<string, (item: T) => string | number | null>): T[] {
  if (!sort) return items
  const getter = getters[sort.key]
  if (!getter) return items
  return [...items].sort((a, b) => {
    const va = getter(a)
    const vb = getter(b)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === "string" && typeof vb === "string") {
      return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    return sort.dir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })
}

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

export default function AdminInvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const session = useSession()
  const userRole = session.data?.user?.role
  const [scopedClientId] = useState(() => {
    if (typeof window === "undefined") return null
    const stored = sessionStorage.getItem("investmentClientScope")
    if (stored) sessionStorage.removeItem("investmentClientScope")
    return stored
  })
  const [investment, setInvestment] = useState<InvestmentDetail | null>(null)
  const [allClients, setAllClients] = useState<{ id: string; name: string; email: string }[]>([])
  const [allAssetClasses, setAllAssetClasses] = useState<AssetClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Valuations state
  const [valuations, setValuations] = useState<Valuation[]>([])
  const [valuationsLoading, setValuationsLoading] = useState(false)
  const [addValuationOpen, setAddValuationOpen] = useState(false)
  const [editingValuation, setEditingValuation] = useState<Valuation | null>(null)

  // Dialogs
  const [editOpen, setEditOpen] = useState(false)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [dealRoomOpen, setDealRoomOpen] = useState(false)
  const [docUploadOpen, setDocUploadOpen] = useState(false)
  const [distributionOpen, setDistributionOpen] = useState(false)
  const [distributionTarget, setDistributionTarget] = useState<{ clientInvestmentId: string; clientName: string } | null>(null)
  const [bulkDistributionOpen, setBulkDistributionOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletePositionOpen, setDeletePositionOpen] = useState(false)
  const [deletingPosition, setDeletingPosition] = useState(false)
  const [deletePositionTarget, setDeletePositionTarget] = useState<{ id: string; clientName: string } | null>(null)
  const [editPositionOpen, setEditPositionOpen] = useState(false)
  const [editPositionTarget, setEditPositionTarget] = useState<ClientPosition | null>(null)
  const [editDistributionOpen, setEditDistributionOpen] = useState(false)
  const [editDistributionTarget, setEditDistributionTarget] = useState<DistributionRecord | null>(null)
  const [selectedDistributions, setSelectedDistributions] = useState<Set<string>>(new Set())
  const [deleteDistributionsOpen, setDeleteDistributionsOpen] = useState(false)
  const [deletingDistributions, setDeletingDistributions] = useState(false)
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set())
  const [deletePositionsOpen, setDeletePositionsOpen] = useState(false)
  const [deletingPositions, setDeletingPositions] = useState(false)
  const [selectedValuations, setSelectedValuations] = useState<Set<string>>(new Set())
  const [deleteValuationsOpen, setDeleteValuationsOpen] = useState(false)
  const [deletingValuations, setDeletingValuations] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [deleteDocumentsOpen, setDeleteDocumentsOpen] = useState(false)
  const [deletingDocuments, setDeletingDocuments] = useState(false)

  // Show deleted toggles
  const [showDeletedDocs, setShowDeletedDocs] = useState(false)

  // Sort state for tables
  const [clientSort, setClientSort] = useState<SortState<string>>(null)
  const [distSort, setDistSort] = useState<SortState<string>>({ key: "date", dir: "desc" })
  const [valSort, setValSort] = useState<SortState<string>>({ key: "date", dir: "desc" })
  const [docSort, setDocSort] = useState<SortState<string>>(null)
  const [editContributionOpen, setEditContributionOpen] = useState(false)
  const [editContributionTarget, setEditContributionTarget] = useState<ContributionRecord | null>(null)
  const [addContributionOpen, setAddContributionOpen] = useState(false)
  const [deleteContributionOpen, setDeleteContributionOpen] = useState(false)
  const [deleteContributionTarget, setDeleteContributionTarget] = useState<ContributionRecord | null>(null)
  const [deletingContribution, setDeletingContribution] = useState(false)

  const fetchInvestment = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (showDeletedDocs) params.set("includeDeletedDocs", "true")
      const qs = params.toString()
      const res = await fetch(`/api/admin/investments/${id}${qs ? `?${qs}` : ""}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error("Investment not found")
        throw new Error("Failed to fetch investment")
      }
      const data = await res.json()
      setInvestment(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [id, showDeletedDocs])

  const fetchValuations = useCallback(async () => {
    setValuationsLoading(true)
    try {
      const res = await fetch(`/api/admin/investments/${id}/valuations`)
      if (!res.ok) return
      const data = await res.json()
      setValuations(data)
    } catch {
      // Non-critical
    } finally {
      setValuationsLoading(false)
    }
  }, [id])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?pageSize=100&status=active")
      if (!res.ok) return
      const data = await res.json()
      setAllClients(
        data.clients.map((c: { id: string; name: string; email: string }) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))
      )
    } catch {
      // Non-critical, ignore
    }
  }, [])

  const fetchAssetClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/asset-classes")
      if (!res.ok) return
      const data = await res.json()
      setAllAssetClasses(data.map((ac: { id: string; name: string }) => ({ id: ac.id, name: ac.name })))
    } catch {
      // Non-critical, ignore
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchInvestment()
      fetchValuations()
      fetchClients()
      fetchAssetClasses()
    })
  }, [fetchInvestment, fetchValuations, fetchClients, fetchAssetClasses])

  const handleDeleteValuation = async (valuationId: string) => {
    if (!confirm("Delete this valuation?")) return
    try {
      const res = await fetch(
        `/api/admin/investments/${id}/valuations/${valuationId}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        fetchValuations()
        fetchInvestment()
      }
    } catch {
      // ignore
    }
  }

  const handleValuationSuccess = () => {
    fetchValuations()
    fetchInvestment()
  }

  const handleDeleteInvestment = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/investments/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete investment")
      router.push("/admin/investments")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete investment")
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleDeletePosition = async () => {
    if (!deletePositionTarget) return
    setDeletingPosition(true)
    try {
      const res = await fetch(
        `/api/admin/investments/${id}/clients/${deletePositionTarget.id}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to remove position")
      setDeletePositionOpen(false)
      setDeletePositionTarget(null)
      // In the client-scoped view the deleted position is the whole page — send
      // the admin back to the client. Otherwise stay on the fund and refresh.
      if (scopedClientId) {
        router.push(`/admin/clients/${scopedClientId}`)
      } else {
        fetchInvestment()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove position")
    } finally {
      setDeletingPosition(false)
    }
  }

  const handleDeleteContribution = async () => {
    if (!deleteContributionTarget) return
    setDeletingContribution(true)
    try {
      const res = await fetch(`/api/admin/contributions/${deleteContributionTarget.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete contribution")
      setDeleteContributionOpen(false)
      setDeleteContributionTarget(null)
      fetchInvestment()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contribution")
    } finally {
      setDeletingContribution(false)
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/investments")} className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Investments
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!investment) return null

  // Client-scoped view: when navigating from a client detail page
  const clientPosition = scopedClientId
    ? investment.clientInvestments.find((ci) => ci.userId === scopedClientId)
    : null
  const isClientScoped = !!scopedClientId && !!clientPosition

  const totalInvested = isClientScoped
    ? Number(clientPosition.amountInvested)
    : investment.clientInvestments.reduce(
        (sum, ci) => sum + Number(ci.amountInvested),
        0
      )
  const totalCurrentValue = isClientScoped
    ? Number(clientPosition.currentValue)
    : investment.clientInvestments.reduce(
        (sum, ci) => sum + Number(ci.currentValue),
        0
      )

  // Filter documents when client-scoped: show client-specific docs + investment-level (no userId) docs
  const displayDocuments = isClientScoped
    ? investment.documents.filter((doc) => doc.userId === scopedClientId || doc.userId === null)
    : investment.documents

  // Chart data: valuations sorted by date ascending
  const chartData = [...valuations]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((v) => ({
      date: formatDateOnly(v.date),
      value: Number(v.totalValue),
    }))

  // Aggregate distributions — scoped to one client when viewing from client page
  const relevantPositions = isClientScoped
    ? investment.clientInvestments.filter((ci) => ci.userId === scopedClientId)
    : investment.clientInvestments
  const allDistributionsRaw = relevantPositions.flatMap((ci) =>
    ci.distributions.map((d) => ({
      ...d,
      clientName: ci.user.name || ci.user.email,
      clientId: ci.userId,
    }))
  )

  // Aggregate contributions for scoped client
  const allContributionsRaw = relevantPositions.flatMap((ci) =>
    ci.contributions.map((c) => ({
      ...c,
      clientName: ci.user.name || ci.user.email,
    }))
  )
  const allContributions = [...allContributionsRaw].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const allDistributions = sortItems(allDistributionsRaw, distSort || { key: "date", dir: "desc" }, {
    date: (d) => new Date(d.date).getTime(),
    client: (d) => d.clientName,
    amount: (d) => Number(d.amount),
    type: (d) => d.type,
    status: (d) => d.status,
  })

  // Sorted client positions
  const sortedPositions = sortItems(investment.clientInvestments, clientSort, {
    client: (ci) => ci.user.name || ci.user.email,
    invested: (ci) => Number(ci.amountInvested),
    currentValue: (ci) => Number(ci.currentValue),
    cashDistributed: (ci) => Number(ci.cashDistributed),
    apr: (ci) => ci.adminApr != null ? Number(ci.adminApr) : null,
    date: (ci) => new Date(ci.investmentDate).getTime(),
  })

  // Sorted valuations
  const sortedValuations = sortItems(valuations, valSort || { key: "date", dir: "desc" }, {
    date: (v) => new Date(v.date).getTime(),
    totalValue: (v) => Number(v.totalValue),
    enteredBy: (v) => v.createdBy?.name || v.createdBy?.email || "",
  })

  // Sorted documents
  const sortedDocuments = sortItems(displayDocuments, docSort, {
    name: (d) => d.name,
    type: (d) => d.type,
    size: (d) => d.fileSize,
    uploaded: (d) => new Date(d.createdAt).getTime(),
  })

  // Build distribution chart data (monthly bars + cumulative lines)
  const distributionChartData = (() => {
    const allContributions = relevantPositions.flatMap((ci) => ci.contributions)
    const allDists = relevantPositions.flatMap((ci) => ci.distributions)

    const months = new Map<string, { monthlyDistribution: number; contributions: number }>()

    for (const c of allContributions) {
      const key = new Date(c.date).toISOString().slice(0, 7)
      const entry = months.get(key) || { monthlyDistribution: 0, contributions: 0 }
      entry.contributions += Number(c.amount)
      months.set(key, entry)
    }
    for (const d of allDists) {
      const key = new Date(d.date).toISOString().slice(0, 7)
      const entry = months.get(key) || { monthlyDistribution: 0, contributions: 0 }
      entry.monthlyDistribution += Number(d.amount)
      months.set(key, entry)
    }

    const sorted = [...months.entries()].sort(([a], [b]) => a.localeCompare(b))
    if (sorted.length < 1) return []

    let cumulativeDeployed = 0
    let cumulativeDistributions = 0

    return sorted.map(([month, data]) => {
      cumulativeDeployed += data.contributions
      cumulativeDistributions += data.monthlyDistribution
      const [y, m] = month.split("-")
      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      })
      return {
        month: label,
        monthlyDistribution: data.monthlyDistribution,
        cumulativeDeployed,
        cumulativeDistributions,
      }
    })
  })()

  const distTypeLabel = (type: string) => {
    switch (type) {
      case "CASH": return "Cash"
      case "REINVESTMENT": return "Reinvestment"
      case "RETURN_OF_CAPITAL": return "Return of Capital"
      default: return type
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(isClientScoped ? `/admin/clients/${scopedClientId}` : "/admin/investments")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {isClientScoped ? `Back to ${clientPosition.user.name}` : "Back to Investments"}
          </Button>
          {isClientScoped && (
            <p className="text-sm text-muted-foreground mb-1">{clientPosition.user.name}&apos;s Position</p>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{investment.name}</h1>
            <Badge variant={statusVariant(investment.status)}>{investment.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{investment.assetClass.name}</p>
        </div>
        <div className="flex gap-2">
          {isClientScoped ? (
            <>
              {userRole === "SUPER_ADMIN" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeletePositionTarget({ id: clientPosition.id, clientName: clientPosition.user.name || clientPosition.user.email })
                    setDeletePositionOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Position
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditPositionTarget(clientPosition)
                  setEditPositionOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit Position
              </Button>
            </>
          ) : (
            <>
              {userRole === "SUPER_ADMIN" && (
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit Investment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 ${isClientScoped ? "md:grid-cols-4" : "md:grid-cols-5"}`}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{isClientScoped ? "Invested" : "Total Invested"}</p>
            <p className="text-xl font-bold">{formatCurrency(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-xl font-bold">{formatCurrency(totalCurrentValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{isClientScoped ? "Cash Distributed" : "Total Distributed"}</p>
            <p className="text-xl font-bold">
              {formatCurrency(
                isClientScoped
                  ? Number(clientPosition.cashDistributed)
                  : investment.clientInvestments.reduce(
                      (sum, ci) => sum + Number(ci.cashDistributed),
                      0
                    )
              )}
            </p>
          </CardContent>
        </Card>
        {!isClientScoped && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Client Positions</p>
              <p className="text-xl font-bold">{investment.clientInvestments.length}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Target Return</p>
            <p className="text-xl font-bold">
              {investment.targetReturn != null
                ? formatPercentage(investment.targetReturn)
                : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          {!isClientScoped && (
            <TabsTrigger value="clients">
              <Users className="h-4 w-4 mr-1.5" />
              Client Positions ({investment.clientInvestments.length})
            </TabsTrigger>
          )}
          {isClientScoped && (
            <TabsTrigger value="contributions">
              <Plus className="h-4 w-4 mr-1.5" />
              Contributions ({allContributions.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="distributions">
            <DollarSign className="h-4 w-4 mr-1.5" />
            Distributions ({allDistributions.length})
          </TabsTrigger>
          {!isClientScoped && (
            <TabsTrigger value="valuations">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Valuations ({valuations.length})
            </TabsTrigger>
          )}
          {!isClientScoped && (
            <TabsTrigger value="dealroom">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Deal Room ({investment.dealRoomUpdates.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1.5" />
            Documents ({displayDocuments.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{investment.description || "No description"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-sm mt-1">{investment.location || "--"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vintage</p>
                  <p className="text-sm mt-1">{investment.vintage ?? "--"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Investment</p>
                  <p className="text-sm mt-1">
                    {investment.minimumInvestment != null
                      ? formatCurrency(investment.minimumInvestment)
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-sm mt-1">
                    {investment.startDate ? formatDateOnly(investment.startDate) : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-sm mt-1">
                    {investment.endDate ? formatDateOnly(investment.endDate) : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Hold Period</p>
                  <p className="text-sm mt-1">{investment.targetHoldPeriod || "--"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distribution Cadence</p>
                  <p className="text-sm mt-1">{investment.distributionCadence || "--"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fund Status</p>
                  <p className="text-sm mt-1">{investment.fundStatus || "--"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm mt-1">{formatDate(investment.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Positions Tab */}
        <TabsContent value="clients" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              {selectedPositions.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeletePositionsOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedPositions.size})
                </Button>
              )}
            </div>
            <Button size="sm" onClick={() => setAddClientOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                        checked={sortedPositions.length > 0 && selectedPositions.size === sortedPositions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPositions(new Set(sortedPositions.map((ci) => ci.id)))
                          } else {
                            setSelectedPositions(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <SortableHead label="Client" sortKey="client" sort={clientSort} onSort={setClientSort} />
                    <SortableHead label="Invested" sortKey="invested" sort={clientSort} onSort={setClientSort} className="text-right" />
                    <SortableHead label="Current Value" sortKey="currentValue" sort={clientSort} onSort={setClientSort} className="text-right" />
                    <SortableHead label="Cash Distributed" sortKey="cashDistributed" sort={clientSort} onSort={setClientSort} className="text-right" />
                    <SortableHead label="APR" sortKey="apr" sort={clientSort} onSort={setClientSort} className="text-right" />
                    <SortableHead label="Date" sortKey="date" sort={clientSort} onSort={setClientSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPositions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No client positions yet. Add a client to this investment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPositions.map((ci) => (
                      <TableRow
                        key={ci.id}
                        className={`cursor-pointer${selectedPositions.has(ci.id) ? " bg-[#FDF5E8]/50" : ""}`}
                        onClick={() => router.push(`/admin/clients/${ci.user.id}`)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                            checked={selectedPositions.has(ci.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const next = new Set(selectedPositions)
                              if (e.target.checked) {
                                next.add(ci.id)
                              } else {
                                next.delete(ci.id)
                              }
                              setSelectedPositions(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ci.user.name}</p>
                            <p className="text-xs text-muted-foreground">{ci.user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ci.amountInvested)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ci.currentValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ci.cashDistributed)}
                        </TableCell>
                        <TableCell className="text-right">
                          {ci.adminApr != null ? `${Number(ci.adminApr).toFixed(2)}%` : "--"}
                        </TableCell>
                        <TableCell>{formatDateOnly(ci.investmentDate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditPositionTarget(ci)
                                setEditPositionOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDistributionTarget({
                                  clientInvestmentId: ci.id,
                                  clientName: ci.user.name || ci.user.email,
                                })
                                setDistributionOpen(true)
                              }}
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              Distribution
                            </Button>
                            {userRole === "SUPER_ADMIN" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletePositionTarget({
                                    id: ci.id,
                                    clientName: ci.user.name || ci.user.email,
                                  })
                                  setDeletePositionOpen(true)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contributions Tab (client-scoped only) */}
        {isClientScoped && (
          <TabsContent value="contributions" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setAddContributionOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Contribution
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allContributions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          <Plus className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                          <p>No contributions recorded yet.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      allContributions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{formatDateOnly(c.date)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(c.amount))}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {c.description || "--"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === "COMPLETED" ? "default" : "secondary"}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit contribution"
                                onClick={() => { setEditContributionTarget(c); setEditContributionOpen(true) }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete contribution"
                                onClick={() => { setDeleteContributionTarget(c); setDeleteContributionOpen(true) }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Distributions Tab */}
        <TabsContent value="distributions" className="mt-4 space-y-4">
          {/* Distribution Chart */}
          {distributionChartData.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Capital Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={distributionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1_000_000
                          ? `$${(val / 1_000_000).toFixed(1)}M`
                          : `$${(val / 1_000).toFixed(0)}K`
                      }
                      width={70}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value ?? 0)),
                        name === "monthlyDistribution"
                          ? "Monthly Distribution"
                          : name === "cumulativeDeployed"
                            ? "Cumulative Deployed"
                            : "Cumulative Distributions",
                      ]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value: string) =>
                        value === "monthlyDistribution"
                          ? "Monthly Distribution"
                          : value === "cumulativeDeployed"
                            ? "Cumulative Deployed"
                            : "Cumulative Distributions"
                      }
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="monthlyDistribution"
                      fill="#B07D3A"
                      radius={[3, 3, 0, 0]}
                      barSize={24}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeDeployed"
                      stroke="#1A2640"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativeDistributions"
                      stroke="#3b6d11"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <div>
              {selectedDistributions.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDistributionsOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedDistributions.size})
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {isClientScoped && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDistributionTarget({ clientInvestmentId: clientPosition.id, clientName: clientPosition.user.name || clientPosition.user.email })
                    setDistributionOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Distribution
                </Button>
              )}
              {!isClientScoped && (
                <Button size="sm" variant="outline" onClick={() => setBulkDistributionOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Bulk Upload
                </Button>
              )}
            </div>
          </div>

          {/* Distributions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                        checked={allDistributions.length > 0 && selectedDistributions.size === allDistributions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDistributions(new Set(allDistributions.map((d) => d.id)))
                          } else {
                            setSelectedDistributions(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <SortableHead label="Date" sortKey="date" sort={distSort} onSort={setDistSort} />
                    {!isClientScoped && <SortableHead label="Client" sortKey="client" sort={distSort} onSort={setDistSort} />}
                    <SortableHead label="Amount" sortKey="amount" sort={distSort} onSort={setDistSort} className="text-right" />
                    <SortableHead label="Type" sortKey="type" sort={distSort} onSort={setDistSort} />
                    <TableHead>Notes</TableHead>
                    <SortableHead label="Status" sortKey="status" sort={distSort} onSort={setDistSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDistributions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isClientScoped ? 7 : 8} className="text-center py-12 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p>No distributions recorded yet.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allDistributions.map((d) => (
                      <TableRow key={d.id} className={selectedDistributions.has(d.id) ? "bg-[#FDF5E8]/50" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                            checked={selectedDistributions.has(d.id)}
                            onChange={(e) => {
                              const next = new Set(selectedDistributions)
                              if (e.target.checked) {
                                next.add(d.id)
                              } else {
                                next.delete(d.id)
                              }
                              setSelectedDistributions(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>{formatDateOnly(d.date)}</TableCell>
                        {!isClientScoped && <TableCell className="font-medium">{d.clientName}</TableCell>}
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(d.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{distTypeLabel(d.type)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {d.description || "--"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.status === "COMPLETED" ? "default" : "secondary"}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditDistributionTarget(d)
                              setEditDistributionOpen(true)
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
        </TabsContent>

        {/* Valuations Tab */}
        <TabsContent value="valuations" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              {selectedValuations.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteValuationsOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedValuations.size})
                </Button>
              )}
            </div>
            <Button size="sm" onClick={() => setAddValuationOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Valuation
            </Button>
          </div>

          {/* NAV Chart */}
          {chartData.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fund NAV Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1_000_000
                          ? `$${(val / 1_000_000).toFixed(1)}M`
                          : `$${(val / 1_000).toFixed(0)}K`
                      }
                      width={70}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatCurrency(Number(value ?? 0)),
                        "Total Value",
                      ]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Valuations Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                        checked={sortedValuations.length > 0 && selectedValuations.size === sortedValuations.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedValuations(new Set(sortedValuations.map((v) => v.id)))
                          } else {
                            setSelectedValuations(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <SortableHead label="Date" sortKey="date" sort={valSort} onSort={setValSort} />
                    <SortableHead label="Total Value" sortKey="totalValue" sort={valSort} onSort={setValSort} className="text-right" />
                    <TableHead>Notes</TableHead>
                    <SortableHead label="Entered By" sortKey="enteredBy" sort={valSort} onSort={setValSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Loading valuations...
                      </TableCell>
                    </TableRow>
                  ) : sortedValuations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p>No valuations yet. Add a valuation to track fund NAV.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedValuations.map((v) => (
                      <TableRow key={v.id} className={selectedValuations.has(v.id) ? "bg-[#FDF5E8]/50" : ""}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                            checked={selectedValuations.has(v.id)}
                            onChange={(e) => {
                              const next = new Set(selectedValuations)
                              if (e.target.checked) {
                                next.add(v.id)
                              } else {
                                next.delete(v.id)
                              }
                              setSelectedValuations(next)
                            }}
                          />
                        </TableCell>
                        <TableCell>{formatDateOnly(v.date)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(v.totalValue))}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {v.notes || "--"}
                        </TableCell>
                        <TableCell>
                          {v.createdBy?.name || v.createdBy?.email || "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingValuation(v)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteValuation(v.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deal Room Tab */}
        <TabsContent value="dealroom" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDealRoomOpen(true)}>
              <Plus className="h-4 w-4" />
              Post Update
            </Button>
          </div>
          {investment.dealRoomUpdates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p>No deal room updates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {investment.dealRoomUpdates.map((update) => (
                <Card key={update.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{update.title}</CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {selectedDocuments.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDocumentsOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedDocuments.size})
                </Button>
              )}
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showDeletedDocs}
                  onChange={(e) => setShowDeletedDocs(e.target.checked)}
                  className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                />
                Show deleted
              </label>
            </div>
            <Button size="sm" onClick={() => setDocUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                        checked={sortedDocuments.length > 0 && selectedDocuments.size === sortedDocuments.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments(new Set(sortedDocuments.map((d) => d.id)))
                          } else {
                            setSelectedDocuments(new Set())
                          }
                        }}
                      />
                    </TableHead>
                    <SortableHead label="Name" sortKey="name" sort={docSort} onSort={setDocSort} />
                    <SortableHead label="Type" sortKey="type" sort={docSort} onSort={setDocSort} />
                    <SortableHead label="Size" sortKey="size" sort={docSort} onSort={setDocSort} />
                    <SortableHead label="Uploaded" sortKey="uploaded" sort={docSort} onSort={setDocSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No documents attached to this investment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedDocuments.map((doc) => (
                      <TableRow key={doc.id} className={`${selectedDocuments.has(doc.id) ? "bg-[#FDF5E8]/50" : ""} ${doc.deletedAt ? "opacity-50" : ""}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                            checked={selectedDocuments.has(doc.id)}
                            onChange={(e) => {
                              const next = new Set(selectedDocuments)
                              if (e.target.checked) {
                                next.add(doc.id)
                              } else {
                                next.delete(doc.id)
                              }
                              setSelectedDocuments(next)
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{(doc.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`/api/admin/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                          >
                            Download
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InvestmentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        investment={investment}
        assetClasses={allAssetClasses.length > 0 ? allAssetClasses : [investment.assetClass]}
        onSuccess={fetchInvestment}
      />

      <ClientInvestmentDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        investmentId={investment.id}
        clients={allClients}
        onSuccess={fetchInvestment}
      />

      <EditClientInvestmentDialog
        open={editPositionOpen}
        onOpenChange={setEditPositionOpen}
        investmentId={investment.id}
        position={editPositionTarget}
        onSuccess={fetchInvestment}
      />

      <DealRoomUpdateDialog
        open={dealRoomOpen}
        onOpenChange={setDealRoomOpen}
        investmentId={investment.id}
        onSuccess={fetchInvestment}
      />

      <DocumentUploadDialog
        open={docUploadOpen}
        onOpenChange={setDocUploadOpen}
        investments={[{ id: investment.id, name: investment.name }]}
        onSuccess={fetchInvestment}
      />

      <ValuationFormDialog
        open={addValuationOpen}
        onOpenChange={setAddValuationOpen}
        investmentId={investment.id}
        onSuccess={handleValuationSuccess}
      />

      <ValuationFormDialog
        open={!!editingValuation}
        onOpenChange={(open) => { if (!open) setEditingValuation(null) }}
        investmentId={investment.id}
        onSuccess={handleValuationSuccess}
        existing={editingValuation || undefined}
      />

      {distributionTarget && (
        <DistributionFormDialog
          open={distributionOpen}
          onOpenChange={(open) => {
            setDistributionOpen(open)
            if (!open) setDistributionTarget(null)
          }}
          investmentId={investment.id}
          clientInvestmentId={distributionTarget.clientInvestmentId}
          clientName={distributionTarget.clientName}
          onSuccess={fetchInvestment}
        />
      )}

      <DistributionImportDialog
        open={bulkDistributionOpen}
        onOpenChange={setBulkDistributionOpen}
        investmentId={investment.id}
        onSuccess={fetchInvestment}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Investment"
        description={`Are you sure you want to delete ${investment.name}? This will hide the investment from all views. Client positions and related data will be preserved. This action can be reversed.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteInvestment}
        loading={deleting}
      />

      <EditDistributionDialog
        open={editDistributionOpen}
        onOpenChange={(open) => {
          setEditDistributionOpen(open)
          if (!open) setEditDistributionTarget(null)
        }}
        distribution={editDistributionTarget}
        onSuccess={fetchInvestment}
      />

      <EditContributionDialog
        open={editContributionOpen}
        onOpenChange={(open) => {
          setEditContributionOpen(open)
          if (!open) setEditContributionTarget(null)
        }}
        contribution={editContributionTarget}
        onSuccess={fetchInvestment}
      />

      {isClientScoped && clientPosition && (
        <ContributionFormDialog
          open={addContributionOpen}
          onOpenChange={setAddContributionOpen}
          investmentId={investment.id}
          clientInvestmentId={clientPosition.id}
          clientName={clientPosition.user.name || clientPosition.user.email}
          onSuccess={fetchInvestment}
        />
      )}

      <ConfirmDialog
        open={deleteContributionOpen}
        onOpenChange={(open) => {
          setDeleteContributionOpen(open)
          if (!open) setDeleteContributionTarget(null)
        }}
        title="Delete Contribution"
        description={`Delete this contribution${deleteContributionTarget ? ` of ${formatCurrency(Number(deleteContributionTarget.amount))}` : ""}? This soft-deletes the record and can be reversed by an administrator.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteContribution}
        loading={deletingContribution}
      />

      <ConfirmDialog
        open={deletePositionOpen}
        onOpenChange={(open) => {
          setDeletePositionOpen(open)
          if (!open) setDeletePositionTarget(null)
        }}
        title="Remove Position"
        description={`Are you sure you want to remove ${deletePositionTarget?.clientName}'s position? Distribution and contribution records will be preserved. This action can be reversed.`}
        confirmLabel="Remove"
        onConfirm={handleDeletePosition}
        loading={deletingPosition}
      />

      <ConfirmDialog
        open={deleteDistributionsOpen}
        onOpenChange={setDeleteDistributionsOpen}
        title="Delete Distributions"
        description={`Are you sure you want to delete ${selectedDistributions.size} distribution${selectedDistributions.size !== 1 ? "s" : ""}? This will subtract the amounts from each client's cash distributed total. This action can be reversed.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          setDeletingDistributions(true)
          try {
            const res = await fetch("/api/admin/distributions", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: Array.from(selectedDistributions) }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error || "Delete failed")
            }
            setSelectedDistributions(new Set())
            setDeleteDistributionsOpen(false)
            fetchInvestment()
          } catch (err) {
            console.error("Error deleting distributions:", err)
          } finally {
            setDeletingDistributions(false)
          }
        }}
        loading={deletingDistributions}
      />

      <ConfirmDialog
        open={deletePositionsOpen}
        onOpenChange={setDeletePositionsOpen}
        title="Delete Positions"
        description={`Are you sure you want to delete ${selectedPositions.size} client position${selectedPositions.size !== 1 ? "s" : ""}? Distribution and contribution records will be preserved. This action can be reversed.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          setDeletingPositions(true)
          try {
            for (const posId of selectedPositions) {
              const res = await fetch(
                `/api/admin/investments/${investment.id}/clients/${posId}`,
                { method: "DELETE" }
              )
              if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || "Delete failed")
              }
            }
            setSelectedPositions(new Set())
            setDeletePositionsOpen(false)
            fetchInvestment()
          } catch (err) {
            console.error("Error deleting positions:", err)
          } finally {
            setDeletingPositions(false)
          }
        }}
        loading={deletingPositions}
      />

      <ConfirmDialog
        open={deleteValuationsOpen}
        onOpenChange={setDeleteValuationsOpen}
        title="Delete Valuations"
        description={`Are you sure you want to delete ${selectedValuations.size} valuation${selectedValuations.size !== 1 ? "s" : ""}? This action can be reversed.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          setDeletingValuations(true)
          try {
            const res = await fetch(`/api/admin/investments/${investment.id}/valuations`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: Array.from(selectedValuations) }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error || "Delete failed")
            }
            setSelectedValuations(new Set())
            setDeleteValuationsOpen(false)
            fetchValuations()
            fetchInvestment()
          } catch (err) {
            console.error("Error deleting valuations:", err)
          } finally {
            setDeletingValuations(false)
          }
        }}
        loading={deletingValuations}
      />

      <ConfirmDialog
        open={deleteDocumentsOpen}
        onOpenChange={setDeleteDocumentsOpen}
        title="Delete Documents"
        description={`Are you sure you want to delete ${selectedDocuments.size} document${selectedDocuments.size !== 1 ? "s" : ""}? This action can be reversed.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          setDeletingDocuments(true)
          try {
            const res = await fetch("/api/admin/documents", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: Array.from(selectedDocuments) }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error || "Delete failed")
            }
            setSelectedDocuments(new Set())
            setDeleteDocumentsOpen(false)
            fetchInvestment()
          } catch (err) {
            console.error("Error deleting documents:", err)
          } finally {
            setDeletingDocuments(false)
          }
        }}
        loading={deletingDocuments}
      />
    </div>
  )
}

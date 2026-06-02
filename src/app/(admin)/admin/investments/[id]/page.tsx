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
  const [editContributionOpen, setEditContributionOpen] = useState(false)
  const [editContributionTarget, setEditContributionTarget] = useState<ContributionRecord | null>(null)

  const fetchInvestment = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/investments/${id}`)
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
  }, [id])

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
      fetchInvestment()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove position")
    } finally {
      setDeletingPosition(false)
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

  // Aggregate all distributions across all client positions
  const allDistributions = investment.clientInvestments.flatMap((ci) =>
    ci.distributions.map((d) => ({
      ...d,
      clientName: ci.user.name || ci.user.email,
      clientId: ci.userId,
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Build distribution chart data (monthly bars + cumulative lines)
  const distributionChartData = (() => {
    const allContributions = investment.clientInvestments.flatMap((ci) => ci.contributions)
    const allDists = investment.clientInvestments.flatMap((ci) => ci.distributions)

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
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 ${isClientScoped ? "md:grid-cols-3" : "md:grid-cols-5"}`}>
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
        {!isClientScoped && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Distributed</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  investment.clientInvestments.reduce(
                    (sum, ci) => sum + Number(ci.cashDistributed),
                    0
                  )
                )}
              </p>
            </CardContent>
          </Card>
        )}
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
          <TabsTrigger value="distributions">
            <DollarSign className="h-4 w-4 mr-1.5" />
            Distributions ({allDistributions.length})
          </TabsTrigger>
          <TabsTrigger value="valuations">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Valuations ({valuations.length})
          </TabsTrigger>
          <TabsTrigger value="dealroom">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Deal Room ({investment.dealRoomUpdates.length})
          </TabsTrigger>
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
          <div className="flex justify-end gap-2">
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
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">Cash Distributed</TableHead>
                    <TableHead className="text-right">APR</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investment.clientInvestments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No client positions yet. Add a client to this investment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    investment.clientInvestments.map((ci) => (
                      <TableRow
                        key={ci.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/clients/${ci.user.id}`)}
                      >
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

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setBulkDistributionOpen(true)}>
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          </div>

          {/* Distributions Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDistributions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p>No distributions recorded yet.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    allDistributions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{formatDateOnly(d.date)}</TableCell>
                        <TableCell className="font-medium">{d.clientName}</TableCell>
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
          <div className="flex justify-end">
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Entered By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Loading valuations...
                      </TableCell>
                    </TableRow>
                  ) : valuations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                        <p>No valuations yet. Add a valuation to track fund NAV.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    valuations.map((v) => (
                      <TableRow key={v.id}>
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
          <div className="flex justify-end">
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No documents attached to this investment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayDocuments.map((doc) => (
                      <TableRow key={doc.id}>
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
    </div>
  )
}

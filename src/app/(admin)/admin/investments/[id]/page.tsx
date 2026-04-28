"use client"

import { useState, useEffect, useCallback, use } from "react"
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
import { DealRoomUpdateDialog } from "@/components/admin/deal-room-update-dialog"
import { DocumentUploadDialog } from "@/components/admin/document-upload-dialog"
import { formatCurrency, formatDate, formatDateOnly, formatPercentage } from "@/lib/utils"
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
} from "lucide-react"

interface ClientPosition {
  id: string
  userId: string
  amountInvested: number
  currentValue: number
  investmentDate: string
  user: {
    id: string
    email: string
    name: string
    company: string | null
  }
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
  const [investment, setInvestment] = useState<InvestmentDetail | null>(null)
  const [allClients, setAllClients] = useState<{ id: string; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialogs
  const [editOpen, setEditOpen] = useState(false)
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [dealRoomOpen, setDealRoomOpen] = useState(false)
  const [docUploadOpen, setDocUploadOpen] = useState(false)

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

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchInvestment()
      fetchClients()
    })
  }, [fetchInvestment, fetchClients])

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

  const totalInvested = investment.clientInvestments.reduce(
    (sum, ci) => sum + Number(ci.amountInvested),
    0
  )
  const totalCurrentValue = investment.clientInvestments.reduce(
    (sum, ci) => sum + Number(ci.currentValue),
    0
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/investments")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Investments
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{investment.name}</h1>
            <Badge variant={statusVariant(investment.status)}>{investment.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{investment.assetClass.name}</p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Investment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Invested</p>
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
            <p className="text-sm text-muted-foreground">Client Positions</p>
            <p className="text-xl font-bold">{investment.clientInvestments.length}</p>
          </CardContent>
        </Card>
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
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 mr-1.5" />
            Client Positions ({investment.clientInvestments.length})
          </TabsTrigger>
          <TabsTrigger value="dealroom">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Deal Room ({investment.dealRoomUpdates.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1.5" />
            Documents ({investment.documents.length})
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
          <div className="flex justify-end">
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
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investment.clientInvestments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                        <TableCell>{ci.user.company || "--"}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ci.amountInvested)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ci.currentValue)}
                        </TableCell>
                        <TableCell>{formatDateOnly(ci.investmentDate)}</TableCell>
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
                  {investment.documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No documents attached to this investment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    investment.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{(doc.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`/api/portal/documents/${doc.id}/download`}
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
        assetClasses={[investment.assetClass]}
        onSuccess={fetchInvestment}
      />

      <ClientInvestmentDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        investmentId={investment.id}
        clients={allClients}
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
    </div>
  )
}

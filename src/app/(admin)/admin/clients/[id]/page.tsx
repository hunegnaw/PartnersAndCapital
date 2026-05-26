"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClientFormDialog } from "@/components/admin/client-form-dialog"
import { DocumentUploadDialog } from "@/components/admin/document-upload-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { cn, formatCurrency, formatDate, formatDateOnly } from "@/lib/utils"
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building,
  Calendar,
  AlertCircle,
  Briefcase,
  FileText,
  UserCog,
  Eye,
  Plus,
  Loader2,
  Download,
  Trash2,
  Upload,
} from "lucide-react"

interface ClientInvestment {
  id: string
  amountInvested: number
  currentValue: number
  investmentDate: string
  investment: {
    id: string
    name: string
    status: string
    assetClass: { id: string; name: string }
  }
  distributions: {
    id: string
    amount: number
    date: string
  }[]
}

interface Document {
  id: string
  name: string
  fileName: string
  type: string
  fileSize: number
  mimeType: string
  createdAt: string
}

interface Advisor {
  id: string
  name: string
  email: string
  firm: string | null
  type: string
  status: string
  advisorUser: { id: string; email: string; name: string } | null
}

interface ClientVerification {
  id: string
  status: string
}

interface ClientDetail {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  role: string
  accountStatus: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  clientInvestments: ClientInvestment[]
  documents: Document[]
  _count: {
    documents: number
  }
  advisorsInvited: Advisor[]
  verification: ClientVerification | null
}

interface AvailableInvestment {
  id: string
  name: string
  status: string
  assetClass: { id: string; name: string }
}

export default function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const session = useSession()
  const userRole = session.data?.user?.role
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [uploadDocOpen, setUploadDocOpen] = useState(false)
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const [addInvestmentOpen, setAddInvestmentOpen] = useState(false)
  const [investments, setInvestments] = useState<AvailableInvestment[]>([])
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("")
  const [investAmount, setInvestAmount] = useState("")
  const [investDate, setInvestDate] = useState("")
  const [addingInvestment, setAddingInvestment] = useState(false)
  const [investmentError, setInvestmentError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingClient, setDeletingClient] = useState(false)

  const fetchClient = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/clients/${id}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error("Client not found")
        throw new Error("Failed to fetch client")
      }
      const data = await res.json()
      setClient(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    Promise.resolve().then(() => fetchClient())
  }, [fetchClient])

  async function openAddInvestment() {
    setInvestmentError(null)
    setSelectedInvestmentId("")
    setInvestAmount("")
    setInvestDate("")
    try {
      const res = await fetch("/api/admin/investments?pageSize=100")
      if (res.ok) {
        const data = await res.json()
        setInvestments(data.investments)
      }
    } catch { /* ignore */ }
    setAddInvestmentOpen(true)
  }

  async function handleAddInvestment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedInvestmentId || !investAmount) return
    setAddingInvestment(true)
    setInvestmentError(null)
    try {
      const res = await fetch(`/api/admin/investments/${selectedInvestmentId}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: id,
          amountInvested: parseFloat(investAmount),
          ...(investDate ? { investmentDate: investDate } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to add investment")
      }
      setAddInvestmentOpen(false)
      fetchClient()
    } catch (err) {
      setInvestmentError(err instanceof Error ? err.message : "Failed to add investment")
    } finally {
      setAddingInvestment(false)
    }
  }

  async function handleDeleteDocument(docId: string) {
    if (deletingDoc) return
    if (!window.confirm("Are you sure you want to delete this document? This cannot be undone.")) return
    setDeletingDoc(docId)
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete document")
      fetchClient()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document")
    } finally {
      setDeletingDoc(null)
    }
  }

  async function handleDeleteClient() {
    setDeletingClient(true)
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete client")
      router.push("/admin/clients")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client")
      setDeletingClient(false)
      setDeleteOpen(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (error) {
    return (
      <div className="p-8">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clients")} className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
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
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!client) return null

  const totalInvested = client.clientInvestments.reduce(
    (sum, ci) => sum + Number(ci.amountInvested),
    0
  )
  const totalValue = client.clientInvestments.reduce(
    (sum, ci) => sum + Number(ci.currentValue),
    0
  )
  const allDistributions = client.clientInvestments.flatMap((ci) => ci.distributions)
  const totalDistributed = allDistributions.reduce(
    (sum, d) => sum + Number(d.amount),
    0
  )
  const distributionCount = allDistributions.length

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/clients")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.verification && (
              <Badge
                variant={
                  client.verification.status === "APPROVED"
                    ? "default"
                    : client.verification.status === "REJECTED"
                      ? "destructive"
                      : "secondary"
                }
                className="cursor-pointer"
                onClick={() => router.push(`/admin/verifications/${client.verification!.id}`)}
              >
                KYC: {client.verification.status.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Client account details</p>
        </div>
        <div className="flex gap-2">
          {userRole === "SUPER_ADMIN" && (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            disabled={impersonating}
            onClick={async () => {
              setImpersonating(true)
              try {
                const res = await fetch("/api/admin/impersonate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ clientId: id }),
                })
                if (res.ok) {
                  router.push("/dashboard")
                } else {
                  const data = await res.json()
                  setError(data.error || "Failed to start impersonation")
                  setImpersonating(false)
                }
              } catch {
                setError("Failed to start impersonation")
                setImpersonating(false)
              }
            }}
          >
            <Eye className="h-4 w-4" />
            {impersonating ? "Loading..." : "View as Client"}
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit Client
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a href={`mailto:${client.email}`} className="text-sm font-medium text-blue-600 hover:underline">{client.email}</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="text-sm font-medium text-blue-600 hover:underline">{client.phone}</a>
                ) : (
                  <p className="text-sm font-medium">--</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{client.company || "--"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">{formatDate(client.createdAt)}</p>
              </div>
            </div>
          </div>

          {client.lastLoginAt && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Last login: {formatDate(client.lastLoginAt)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

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
            <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Distributions</p>
            <p className="text-xl font-bold">{formatCurrency(totalDistributed)}</p>
            <p className="text-xs text-muted-foreground mt-1">{distributionCount} distribution{distributionCount !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Documents</p>
            <p className="text-xl font-bold">{client._count.documents}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="investments">
        <TabsList>
          <TabsTrigger value="investments">
            <Briefcase className="h-4 w-4 mr-1.5" />
            Investments ({client.clientInvestments.length})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1.5" />
            Documents ({client._count.documents})
          </TabsTrigger>
          <TabsTrigger value="advisors">
            <UserCog className="h-4 w-4 mr-1.5" />
            Advisors ({client.advisorsInvited.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-sm font-medium">Investments</CardTitle>
              <Button size="sm" onClick={openAddInvestment}>
                <Plus className="h-4 w-4 mr-1" />
                Add Investment
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investment</TableHead>
                    <TableHead>Asset Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.clientInvestments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No investments yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    client.clientInvestments.map((ci) => (
                      <TableRow
                        key={ci.id}
                        className="cursor-pointer"
                        onClick={() => {
                          sessionStorage.setItem("investmentClientScope", id)
                          router.push(`/admin/investments/${ci.investment.id}`)
                        }}
                      >
                        <TableCell className="font-medium">{ci.investment.name}</TableCell>
                        <TableCell>{ci.investment.assetClass.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ci.investment.status}</Badge>
                        </TableCell>
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

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <Button size="sm" onClick={() => setUploadDocOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                Upload Document
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No documents uploaded. Click &ldquo;Upload Document&rdquo; to add one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    client.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`/api/admin/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            {userRole === "SUPER_ADMIN" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id)}
                                disabled={deletingDoc === doc.id}
                              >
                                <Trash2 className="h-4 w-4" />
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

        <TabsContent value="advisors" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.advisorsInvited.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No advisors linked to this client.
                      </TableCell>
                    </TableRow>
                  ) : (
                    client.advisorsInvited.map((advisor) => (
                      <TableRow key={advisor.id}>
                        <TableCell className="font-medium">{advisor.name}</TableCell>
                        <TableCell>{advisor.email}</TableCell>
                        <TableCell>{advisor.firm || "--"}</TableCell>
                        <TableCell>{advisor.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              advisor.status === "ACTIVE"
                                ? "default"
                                : advisor.status === "PENDING"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {advisor.status}
                          </Badge>
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

      <ClientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={{ ...client, phone: client.phone ?? undefined, company: client.company ?? undefined, accountStatus: client.accountStatus }}
        onSuccess={fetchClient}
      />

      <DocumentUploadDialog
        open={uploadDocOpen}
        onOpenChange={setUploadDocOpen}
        clients={[{ id: client.id, name: client.name }]}
        onSuccess={fetchClient}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Client"
        description={`Are you sure you want to delete ${client.name}? This will archive their account and hide them from active views. Their investment data will be preserved. This action can be reversed.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteClient}
        loading={deletingClient}
      />

      {/* Add Investment Dialog */}
      <Dialog open={addInvestmentOpen} onOpenChange={setAddInvestmentOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddInvestment}>
            <DialogHeader>
              <DialogTitle>Add Investment</DialogTitle>
              <DialogDescription>
                Link an existing investment to {client.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {investmentError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {investmentError}
                </div>
              )}
              <div className="grid gap-2">
                <Label>Investment *</Label>
                <Select value={selectedInvestmentId} onValueChange={(v) => setSelectedInvestmentId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an investment">
                      {(() => { const inv = investments.find((i) => i.id === selectedInvestmentId); return inv ? `${inv.name} (${inv.assetClass.name})` : undefined; })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {investments.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.name} ({inv.assetClass.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Amount Invested *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder="100000"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Investment Date</Label>
                <Input
                  type="date"
                  value={investDate}
                  onChange={(e) => setInvestDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddInvestmentOpen(false)} disabled={addingInvestment}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingInvestment || !selectedInvestmentId || !investAmount}>
                {addingInvestment && <Loader2 className="animate-spin" />}
                Add Investment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

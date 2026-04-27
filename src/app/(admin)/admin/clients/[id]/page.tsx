"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { ClientFormDialog } from "@/components/admin/client-form-dialog"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
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

interface ClientDetail {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  role: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  clientInvestments: ClientInvestment[]
  _count: {
    documents: number
  }
  advisorsInvited: Advisor[]
}

export default function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

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
    fetchClient()
  }, [fetchClient])

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
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <p className="text-muted-foreground mt-1">Client account details</p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Client
        </Button>
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
                <p className="text-sm font-medium">{client.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{client.phone || "--"}</p>
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
      <div className="grid gap-4 md:grid-cols-3">
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
                        onClick={() => router.push(`/admin/investments/${ci.investment.id}`)}
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
                        <TableCell>{formatDate(ci.investmentDate)}</TableCell>
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
            <CardContent className="py-12 text-center">
              <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                {client._count.documents > 0
                  ? `${client._count.documents} document${client._count.documents !== 1 ? "s" : ""} on file.`
                  : "No documents uploaded for this client."}
              </p>
              <Link href={`/admin/documents?userId=${client.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
                View Documents
              </Link>
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
        client={{ ...client, phone: client.phone ?? undefined, company: client.company ?? undefined }}
        onSuccess={fetchClient}
      />
    </div>
  )
}

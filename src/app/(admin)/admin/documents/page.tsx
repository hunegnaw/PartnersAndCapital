"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
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
import { DocumentUploadDialog } from "@/components/admin/document-upload-dialog"
import { formatDate } from "@/lib/utils"
import {
  Search,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface DocumentRecord {
  id: string
  name: string
  type: string
  fileName: string
  fileSize: number
  year: number | null
  description: string | null
  createdAt: string
  user: { id: string; name: string; email: string } | null
  investment: { id: string; name: string } | null
}

const DOCUMENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "K1", label: "K-1" },
  { value: "TAX_1099", label: "Tax 1099" },
  { value: "QUARTERLY_REPORT", label: "Quarterly Report" },
  { value: "ANNUAL_REPORT", label: "Annual Report" },
  { value: "SUBSCRIPTION_AGREEMENT", label: "Subscription Agreement" },
  { value: "CAPITAL_CALL_NOTICE", label: "Capital Call Notice" },
  { value: "DISTRIBUTION_NOTICE", label: "Distribution Notice" },
  { value: "PPM", label: "PPM" },
  { value: "INVESTOR_LETTER", label: "Investor Letter" },
  { value: "OTHER", label: "Other" },
]

export default function AdminDocumentsPage() {
  const searchParams = useSearchParams()
  const initialUserId = searchParams.get("userId") || ""

  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [investments, setInvestments] = useState<{ id: string; name: string }[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Dialog state
  const [uploadOpen, setUploadOpen] = useState(false)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.set("search", search)
      if (typeFilter) params.set("type", typeFilter)
      if (yearFilter) params.set("year", yearFilter)
      if (initialUserId) params.set("userId", initialUserId)

      const res = await fetch(`/api/admin/documents?${params}`)
      if (!res.ok) throw new Error("Failed to fetch documents")
      const data = await res.json()
      setDocuments(data.documents)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, typeFilter, yearFilter, initialUserId])

  const fetchOptions = useCallback(async () => {
    try {
      const [clientsRes, investmentsRes] = await Promise.all([
        fetch("/api/admin/clients?pageSize=100&status=active"),
        fetch("/api/admin/investments?pageSize=100"),
      ])
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.clients.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
      if (investmentsRes.ok) {
        const data = await investmentsRes.json()
        setInvestments(
          data.investments.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name }))
        )
      }
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDocuments()
      fetchOptions()
    })
  }, [fetchDocuments, fetchOptions])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchDocuments()
  }

  async function handleDelete(docId: string) {
    if (deleting) return
    if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) return

    setDeleting(docId)
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete document")
      fetchDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document")
    } finally {
      setDeleting(null)
    }
  }

  // Generate year options
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage uploaded documents, K-1s, reports, and more.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload Document
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
              placeholder="Search documents..."
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
            {DOCUMENT_TYPES.map((dt) => (
              <SelectItem key={dt.value || "all"} value={dt.value || "all"}>
                {dt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={yearFilter}
          onValueChange={(val) => {
            setYearFilter(val === "all" ? "" : (val ?? ""))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} document${total !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead className="hidden md:table-cell">Investment</TableHead>
                <TableHead className="hidden lg:table-cell">Year</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {search
                      ? "No documents match your search."
                      : "No documents yet. Upload your first document to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doc.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.user ? doc.user.name : "--"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {doc.investment ? doc.investment.name : "--"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {doc.year ?? "--"}
                    </TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/portal/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleting === doc.id}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clients={clients}
        investments={investments}
        onSuccess={fetchDocuments}
      />
    </div>
  )
}

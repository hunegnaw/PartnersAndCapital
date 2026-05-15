"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, CheckCircle, UserPlus } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface AccessRequest {
  id: string
  name: string
  email: string
  phone: string | null
  smsConsent: boolean
  status: string
  ipAddress: string | null
  createdAt: string
}

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/admin/access-requests?${params}`)
      if (!res.ok) throw new Error("Failed to fetch access requests")
      const data = await res.json()
      setRequests(data.requests)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter])

  useEffect(() => {
    Promise.resolve().then(() => fetchRequests())
  }, [fetchRequests])

  const handleMarkReviewed = async (id: string) => {
    try {
      const res = await fetch("/api/admin/access-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "REVIEWED" }),
      })
      if (!res.ok) throw new Error("Failed to update")
      fetchRequests()
    } catch {
      // ignore
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Access Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review access requests submitted from the login page
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(!val || val === "ALL" ? "" : val)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("")
              setPage(1)
            }}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">SMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <UserPlus className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p>No access requests yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell>{req.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{req.phone || "--"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {req.smsConsent ? (
                        <Badge variant="default" className="bg-[#eaf3de] text-[#3b6d11] hover:bg-[#eaf3de]">Opted In</Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.status === "REVIEWED" ? "default" : "secondary"}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(req.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {req.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkReviewed(req.id)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Mark Reviewed
                        </Button>
                      )}
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

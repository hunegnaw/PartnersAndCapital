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
import { Switch } from "@/components/ui/switch"
import { AlertCircle, CheckCircle, UserPlus, Plus, Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react"
import { PaginationControls } from "@/components/ui/pagination-controls"
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

  // Create/edit modal + delete confirm
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AccessRequest | null>(null)
  const [fName, setFName] = useState("")
  const [fEmail, setFEmail] = useState("")
  const [fPhone, setFPhone] = useState("")
  const [fSms, setFSms] = useState(false)
  const [fStatus, setFStatus] = useState("PENDING")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AccessRequest | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleSetStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update")
      fetchRequests()
    } catch {
      setError("Failed to update status")
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setFName(""); setFEmail(""); setFPhone(""); setFSms(false); setFStatus("PENDING")
    setFormError("")
    setFormOpen(true)
  }

  const openEdit = (r: AccessRequest) => {
    setEditTarget(r)
    setFName(r.name); setFEmail(r.email); setFPhone(r.phone || ""); setFSms(r.smsConsent); setFStatus(r.status)
    setFormError("")
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!fName.trim() || !fEmail.trim()) {
      setFormError("Name and email are required")
      return
    }
    setSaving(true)
    setFormError("")
    try {
      const url = editTarget
        ? `/api/admin/access-requests/${editTarget.id}`
        : "/api/admin/access-requests"
      const res = await fetch(url, {
        method: editTarget ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fName.trim(),
          email: fEmail.trim(),
          phone: fPhone.trim() || null,
          smsConsent: fSms,
          status: fStatus,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Failed to save")
      }
      setFormOpen(false)
      fetchRequests()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/access-requests/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setDeleteTarget(null)
      fetchRequests()
    } catch {
      setError("Failed to delete request")
    } finally {
      setDeleting(false)
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Request
        </Button>
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
                      <div className="flex items-center justify-end gap-1">
                        {req.status === "PENDING" ? (
                          <Button variant="ghost" size="sm" onClick={() => handleSetStatus(req.id, "REVIEWED")} title="Mark as reviewed">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Mark Reviewed</span>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleSetStatus(req.id, "PENDING")} title="Mark as pending">
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Mark Pending</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(req)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(req)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Access Request" : "New Access Request"}</DialogTitle>
            <DialogDescription>
              {editTarget
                ? "Update this access request."
                : "Manually log an access request (e.g. one received by phone or email)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ar-name">Name</Label>
              <Input id="ar-name" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-email">Email</Label>
              <Input id="ar-email" type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} placeholder="name@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-phone">Phone (optional)</Label>
              <Input id="ar-phone" type="tel" value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="ar-sms" className="cursor-pointer">SMS opt-in</Label>
              <Switch id="ar-sms" checked={fSms} onCheckedChange={setFSms} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={fStatus} onValueChange={(v) => v && setFStatus(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !fName.trim() || !fEmail.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Save Changes" : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Request</DialogTitle>
            <DialogDescription>
              Permanently delete the access request from{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>{" "}
              ({deleteTarget?.email})? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

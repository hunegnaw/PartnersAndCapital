"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface AuditLogEntry {
  id: string
  action: string
  targetType: string | null
  targetId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "CREATE_CLIENT", label: "Create Client" },
  { value: "UPDATE_CLIENT", label: "Update Client" },
  { value: "DELETE_CLIENT", label: "Delete Client" },
  { value: "CREATE_INVESTMENT", label: "Create Investment" },
  { value: "UPDATE_INVESTMENT", label: "Update Investment" },
  { value: "DELETE_INVESTMENT", label: "Delete Investment" },
  { value: "ADD_CLIENT_TO_INVESTMENT", label: "Add Client to Investment" },
  { value: "UPLOAD_DOCUMENT", label: "Upload Document" },
  { value: "UPDATE_DOCUMENT", label: "Update Document" },
  { value: "DELETE_DOCUMENT", label: "Delete Document" },
  { value: "CREATE_ACTIVITY_POST", label: "Create Activity Post" },
  { value: "CREATE_DEAL_ROOM_UPDATE", label: "Deal Room Update" },
  { value: "UPDATE_ORGANIZATION", label: "Update Organization" },
  { value: "CREATE_ADMIN_USER", label: "Create Admin User" },
  { value: "UPDATE_ADMIN_USER", label: "Update Admin User" },
  { value: "DELETE_ADMIN_USER", label: "Delete Admin User" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
]

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [actionFilter, setActionFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (actionFilter) params.set("action", actionFilter)
      if (fromDate) params.set("from", fromDate)
      if (toDate) params.set("to", toDate)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (!res.ok) throw new Error("Failed to fetch audit logs")
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, actionFilter, fromDate, toDate])

  useEffect(() => {
    Promise.resolve().then(() => fetchLogs())
  }, [fetchLogs])

  function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Read-only log of all administrative actions.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select
          value={actionFilter}
          onValueChange={(val) => {
            setActionFilter(val === "all" ? "" : (val ?? ""))
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((at) => (
              <SelectItem key={at.value || "all"} value={at.value || "all"}>
                {at.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(1)
            }}
            placeholder="From"
            className="w-[160px]"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(1)
            }}
            placeholder="To"
            className="w-[160px]"
          />
        </div>

        {(actionFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActionFilter("")
              setFromDate("")
              setToDate("")
              setPage(1)
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${total} log entr${total !== 1 ? "ies" : "y"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No audit log entries found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedRow(expandedRow === log.id ? null : log.id)
                      }
                    >
                      <TableCell>
                        {expandedRow === log.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div>
                            <p className="text-sm font-medium">{log.user.name}</p>
                            <p className="text-xs text-muted-foreground">{log.user.role}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-xs">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.targetType ? (
                          <span className="text-sm">
                            {log.targetType}
                            {log.targetId && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({log.targetId.slice(0, 8)}...)
                              </span>
                            )}
                          </span>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {log.ipAddress || "--"}
                      </TableCell>
                    </TableRow>
                    {expandedRow === log.id && (
                      <TableRow key={`${log.id}-details`}>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <div className="p-4 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">
                              Details
                            </p>
                            {log.details ? (
                              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No additional details
                              </p>
                            )}
                            {log.userAgent && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase mt-2">
                                  User Agent
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 break-all">
                                  {log.userAgent}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import {
  Plus,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  User,
} from "lucide-react"

interface ActivityEntry {
  id: string
  title: string
  content: string
  isBroadcast: boolean
  createdAt: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
  targetUser: {
    id: string
    name: string
    email: string
  } | null
}

interface UserOption {
  id: string
  name: string
  email: string
}

export default function AdminActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [isBroadcast, setIsBroadcast] = useState(false)
  const [targetUserId, setTargetUserId] = useState("")
  const [users, setUsers] = useState<UserOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      const res = await fetch(`/api/admin/activity?${params}`)
      if (!res.ok) throw new Error("Failed to fetch activity feed")
      const data = await res.json()
      setEntries(data.entries)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?pageSize=100&status=active")
      if (!res.ok) return
      const data = await res.json()
      setUsers(
        data.clients.map((c: { id: string; name: string; email: string }) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))
      )
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchActivity()
      fetchUsers()
    })
  }, [fetchActivity, fetchUsers])

  function openDialog() {
    setTitle("")
    setContent("")
    setIsBroadcast(false)
    setTargetUserId("")
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { title, content, isBroadcast }
      if (targetUserId) body.targetUserId = targetUserId

      const res = await fetch("/api/admin/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to post update")
      }

      setDialogOpen(false)
      fetchActivity()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">
            Post updates and announcements for clients.
          </p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="h-4 w-4" />
          Post Update
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Activity Feed */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No activity feed entries yet. Post your first update.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                    {entry.isBroadcast && (
                      <Badge variant="default">
                        <Megaphone className="h-3 w-3 mr-1" />
                        Broadcast
                      </Badge>
                    )}
                    {entry.targetUser && (
                      <Badge variant="secondary">
                        <User className="h-3 w-3 mr-1" />
                        {entry.targetUser.name}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Posted by {entry.author.name}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {/* Post Update Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Post Update</DialogTitle>
              <DialogDescription>
                Share an update or announcement with clients.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {formError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="activity-title">Title *</Label>
                <Input
                  id="activity-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Update title"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="activity-content">Content *</Label>
                <Textarea
                  id="activity-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your update here..."
                  rows={5}
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="activity-broadcast"
                  checked={isBroadcast}
                  onCheckedChange={setIsBroadcast}
                />
                <Label htmlFor="activity-broadcast" className="cursor-pointer">
                  Broadcast to all clients
                </Label>
              </div>

              <div className="grid gap-2">
                <Label>Target User (optional)</Label>
                <Select value={targetUserId} onValueChange={(v) => setTargetUserId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a user (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Post Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

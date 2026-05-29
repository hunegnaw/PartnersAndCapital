"use client"

import { useState, useEffect, useCallback } from "react"
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
import { formatDate, cn } from "@/lib/utils"
import {
  Plus,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  User,
  Trash2,
  Flag,
  Search,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react"

interface ThreadSummary {
  id: string
  subject: string
  isBroadcast: boolean
  showAsBanner: boolean
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; email: string }
  participant: { id: string; name: string; email: string } | null
  messageCount: number
  lastMessage: { body: string; createdAt: string; senderId: string } | null
  unread: boolean
}

interface ThreadDetail {
  id: string
  subject: string
  isBroadcast: boolean
  showAsBanner: boolean
  bannerContent: string | null
  createdBy: { id: string; name: string; email: string; role: string }
  participant: { id: string; name: string; email: string } | null
  broadcastParent: { id: string; subject: string } | null
  messages: {
    id: string
    body: string
    createdAt: string
    sender: { id: string; name: string; role: string }
  }[]
}

interface UserOption {
  id: string
  name: string
  email: string
}

export default function AdminSecureCommunicationsPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeBroadcast, setComposeBroadcast] = useState(false)
  const [composeShowBanner, setComposeShowBanner] = useState(false)
  const [composeParticipantId, setComposeParticipantId] = useState("")
  const [users, setUsers] = useState<UserOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Thread detail dialog
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [replying, setReplying] = useState(false)

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchThreads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        filter,
      })
      if (search) params.set("search", search)
      const res = await fetch(`/api/admin/messages?${params}`)
      if (!res.ok) throw new Error("Failed to fetch messages")
      const data = await res.json()
      setThreads(data.threads)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filter, search])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients?pageSize=200&status=active")
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
      fetchThreads()
      fetchUsers()
    })
  }, [fetchThreads, fetchUsers])

  function openCompose() {
    setComposeSubject("")
    setComposeBody("")
    setComposeBroadcast(false)
    setComposeShowBanner(false)
    setComposeParticipantId("")
    setFormError(null)
    setComposeOpen(true)
  }

  async function handleCompose(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        subject: composeSubject,
        body: composeBody,
        isBroadcast: composeBroadcast,
      }
      if (composeBroadcast) {
        payload.showAsBanner = composeShowBanner
      } else {
        payload.participantId = composeParticipantId
      }

      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send message")
      }

      setComposeOpen(false)
      fetchThreads()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  async function openThread(threadId: string) {
    setDetailLoading(true)
    setSelectedThread(null)
    try {
      const res = await fetch(`/api/admin/messages/${threadId}`)
      if (!res.ok) throw new Error("Failed to load thread")
      const data = await res.json()
      setSelectedThread(data)
      // Refresh list to update unread indicators
      fetchThreads()
    } catch {
      // handle silently
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleReply() {
    if (!replyBody || !selectedThread) return
    setReplying(true)
    try {
      const res = await fetch(`/api/admin/messages/${selectedThread.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      })
      if (!res.ok) throw new Error("Failed to send reply")
      setReplyBody("")
      openThread(selectedThread.id)
    } catch {
      // handle silently
    } finally {
      setReplying(false)
    }
  }

  async function handleDelete(threadId: string) {
    if (!confirm("Delete this thread? This cannot be undone.")) return
    setDeleting(threadId)
    try {
      const res = await fetch(`/api/admin/messages/${threadId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      if (selectedThread?.id === threadId) setSelectedThread(null)
      fetchThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Secure Communications</h1>
          <p className="text-muted-foreground mt-1">
            Send and manage secure messages with clients.
          </p>
        </div>
        <Button onClick={openCompose}>
          <Plus className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {[
            { value: "all", label: "All" },
            { value: "broadcast", label: "Broadcasts" },
            { value: "targeted", label: "Targeted" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1) }}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                filter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Thread List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No messages yet. Compose your first message.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => openThread(thread.id)}
              className={cn(
                "w-full text-left bg-white rounded-xl border p-4 hover:bg-muted/30 transition-colors",
                thread.unread && "border-l-4 border-l-[#B07D3A]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-sm font-medium", thread.unread && "font-semibold")}>
                    {thread.subject}
                  </span>
                  {thread.isBroadcast && (
                    <Badge variant="default" className="text-[10px]">
                      <Megaphone className="h-3 w-3 mr-1" />
                      Broadcast
                    </Badge>
                  )}
                  {thread.showAsBanner && (
                    <Badge variant="outline" className="text-[10px] border-[#B07D3A] text-[#B07D3A]">
                      <Flag className="h-3 w-3 mr-1" />
                      Banner
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(thread.updatedAt)}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    {thread.messageCount}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(thread.id) }}
                    disabled={deleting === thread.id}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    {deleting === thread.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {thread.participant ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {thread.participant.name || thread.participant.email}
                  </span>
                ) : thread.isBroadcast ? (
                  <span className="text-xs text-muted-foreground">All Clients</span>
                ) : null}
                {thread.lastMessage && (
                  <span className="text-xs text-muted-foreground truncate max-w-md">
                    &mdash; {thread.lastMessage.body.slice(0, 100)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total}
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

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCompose}>
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
              <DialogDescription>
                Send a secure message to a client or broadcast to all.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {formError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="msg-subject">Subject *</Label>
                <Input
                  id="msg-subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Message subject"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="msg-body">Message *</Label>
                <Textarea
                  id="msg-body"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={5}
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="msg-broadcast"
                  checked={composeBroadcast}
                  onCheckedChange={setComposeBroadcast}
                />
                <Label htmlFor="msg-broadcast" className="cursor-pointer">
                  Broadcast to all clients
                </Label>
              </div>

              {!composeBroadcast && (
                <div className="grid gap-2">
                  <Label>Recipient *</Label>
                  <Select
                    value={composeParticipantId || "none"}
                    onValueChange={(v) => setComposeParticipantId(v === "none" ? "" : v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a client">
                        {(() => { const u = users.find((u) => u.id === composeParticipantId); return u ? `${u.name} (${u.email})` : "Select a client"; })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a client</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {composeBroadcast && (
                <>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="msg-banner"
                      checked={composeShowBanner}
                      onCheckedChange={setComposeShowBanner}
                    />
                    <Label htmlFor="msg-banner" className="cursor-pointer">
                      Show as banner on client portal
                    </Label>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setComposeOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                <Send className="h-4 w-4" />
                Send
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Thread Detail Dialog */}
      <Dialog
        open={!!selectedThread || detailLoading}
        onOpenChange={(open) => { if (!open) setSelectedThread(null) }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : selectedThread ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedThread.subject}</DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  {selectedThread.isBroadcast ? (
                    <Badge variant="default" className="text-[10px]">Broadcast</Badge>
                  ) : selectedThread.participant ? (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedThread.participant.name || selectedThread.participant.email}
                    </span>
                  ) : null}
                  {selectedThread.broadcastParent && (
                    <span className="text-muted-foreground">
                      In reply to broadcast: {selectedThread.broadcastParent.subject}
                    </span>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                {selectedThread.messages.map((msg) => {
                  const isAdmin = msg.sender.role === "ADMIN" || msg.sender.role === "SUPER_ADMIN"
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg p-4",
                        isAdmin
                          ? "bg-[#e6f1fb] border border-[#185fa5]/15"
                          : "bg-[#f5f5f3]"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-[#1a1a18]">
                          {msg.sender.name || "User"}
                        </span>
                        {isAdmin && (
                          <Badge className="text-[10px] bg-[#e6f1fb] text-[#185fa5] border-blue-200">
                            Staff
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  )
                })}
              </div>

              {/* Reply form */}
              <div className="space-y-3 pt-2 border-t mt-4">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={replying || !replyBody}
                >
                  {replying && <Loader2 className="animate-spin mr-2 h-3 w-3" />}
                  <Send className="h-3 w-3 mr-1" />
                  Send Reply
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

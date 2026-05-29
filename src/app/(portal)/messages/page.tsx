"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Mail, Megaphone, Send } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"

interface ThreadSummary {
  id: string
  subject: string
  isBroadcast: boolean
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; role: string }
  messageCount: number
  lastMessage: { body: string; createdAt: string; senderId: string } | null
  unread: boolean
  privateReplyThreadId: string | null
}

interface ThreadDetail {
  id: string
  subject: string
  isBroadcast: boolean
  createdBy: { id: string; name: string; role: string }
  participant: { id: string; name: string } | null
  broadcastParent: { id: string; subject: string } | null
  messages: {
    id: string
    body: string
    createdAt: string
    sender: { id: string; name: string; role: string }
  }[]
}

export default function PortalMessagesPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Compose form
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Thread detail dialog
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [replyMessage, setReplyMessage] = useState("")
  const [replying, setReplying] = useState(false)

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/portal/messages")
      if (!res.ok) throw new Error("Failed to load messages")
      const json = await res.json()
      setThreads(json.threads)
    } catch {
      // handle silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => fetchThreads())
  }, [fetchThreads])

  const handleSubmit = async () => {
    if (!subject || !message) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body: message }),
      })
      if (!res.ok) throw new Error("Failed to send message")
      setSubject("")
      setMessage("")
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      fetchThreads()
    } catch {
      // handle silently
    } finally {
      setSubmitting(false)
    }
  }

  const openThread = async (threadId: string) => {
    setDetailLoading(true)
    setSelectedThread(null)
    try {
      const res = await fetch(`/api/portal/messages/${threadId}`)
      if (!res.ok) throw new Error("Failed to load thread")
      const json = await res.json()
      setSelectedThread(json)
      // Refresh list to update unread indicators
      fetchThreads()
    } catch {
      // handle silently
    } finally {
      setDetailLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyMessage || !selectedThread) return
    setReplying(true)
    try {
      const res = await fetch(`/api/portal/messages/${selectedThread.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyMessage }),
      })
      if (!res.ok) throw new Error("Failed to send reply")

      const result = await res.json()
      setReplyMessage("")

      // If a broadcast reply spawned a new private thread, open that instead
      if (selectedThread.isBroadcast && result.id !== selectedThread.id) {
        openThread(result.id)
      } else {
        openThread(selectedThread.id)
      }
    } catch {
      // handle silently
    } finally {
      setReplying(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a18]">
          Messages
        </h1>
        <p className="text-[#5f5e5a] text-sm mt-1">
          Secure communications with Partners + Capital.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* New Message Form */}
        <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
          <h2 className="text-lg font-semibold text-[#1a1a18] mb-4">
            New Message
          </h2>

          {submitSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
              Message sent successfully.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#5f5e5a]">Subject</Label>
              <Input
                placeholder="What is this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white border-[#dfdedd]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#5f5e5a]">Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="bg-white border-[#dfdedd]"
              />
            </div>

            <p className="text-xs text-[#888780]">
              Messages are delivered securely through your portal.
            </p>

            <Button
              className="w-full bg-[#1A2640] hover:bg-[#2C3E5C] text-white"
              onClick={handleSubmit}
              disabled={submitting || !subject || !message}
            >
              {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </div>
        </div>

        {/* Messages List */}
        <div>
          <h2 className="text-lg font-semibold text-[#1a1a18] mb-4">
            Your Messages
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#dfdedd] p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#dfdedd] p-6 text-center py-12">
              <Mail className="h-10 w-10 text-[#888780] mx-auto mb-3" />
              <p className="text-sm text-[#5f5e5a]">
                No messages yet. When your team sends you a secure communication, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => openThread(thread.id)}
                  className={cn(
                    "w-full text-left bg-white rounded-xl border border-[#dfdedd] p-4 hover:bg-[#f5f5f3] transition-colors",
                    thread.unread && "border-l-4 border-l-[#B07D3A]"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className={cn(
                      "font-medium text-sm text-[#1a1a18]",
                      thread.unread && "font-semibold"
                    )}>
                      {thread.subject}
                    </p>
                    {thread.isBroadcast && (
                      <Badge className="text-[10px] bg-[#e6f1fb] text-[#185fa5] border-blue-200 ml-2 shrink-0">
                        <Megaphone className="h-3 w-3 mr-1" />
                        Broadcast
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#888780]">
                    <span>{formatDate(thread.updatedAt)}</span>
                    <span>&middot;</span>
                    <span>
                      {thread.isBroadcast ? "From Partners + Capital" : `${thread.messageCount} message${thread.messageCount !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                  {thread.lastMessage && (
                    <p className="text-xs text-[#888780] mt-1 truncate">
                      {thread.lastMessage.body.slice(0, 120)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Thread Detail Dialog */}
      <Dialog
        open={!!selectedThread || detailLoading}
        onOpenChange={(open) => { if (!open) setSelectedThread(null) }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-8 text-center text-[#888780]">Loading...</div>
          ) : selectedThread ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedThread.subject}</DialogTitle>
                <div className="flex items-center gap-2 text-xs text-[#888780] pt-1">
                  {selectedThread.isBroadcast ? (
                    <Badge className="text-[10px] bg-[#e6f1fb] text-[#185fa5] border-blue-200">
                      Broadcast
                    </Badge>
                  ) : (
                    <span>Partners + Capital</span>
                  )}
                  {selectedThread.broadcastParent && (
                    <span>
                      In reply to: {selectedThread.broadcastParent.subject}
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
                          {isAdmin ? "Partners + Capital" : (msg.sender.name || "You")}
                        </span>
                        {isAdmin && (
                          <Badge className="text-[10px] bg-[#e6f1fb] text-[#185fa5] border-blue-200">
                            Staff
                          </Badge>
                        )}
                        <span className="text-xs text-[#888780]">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[#5f5e5a] whitespace-pre-wrap">
                        {msg.body}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Reply form */}
              <div className="space-y-3 pt-2 border-t mt-4">
                <Textarea
                  placeholder={selectedThread.isBroadcast ? "Reply privately..." : "Type your reply..."}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                  className="bg-white border-[#dfdedd]"
                />
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={replying || !replyMessage}
                  className="bg-[#1A2640] hover:bg-[#2C3E5C]"
                >
                  {replying && <Loader2 className="animate-spin mr-2 h-3 w-3" />}
                  <Send className="h-3 w-3 mr-1" />
                  {selectedThread.isBroadcast ? "Reply Privately" : "Reply"}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

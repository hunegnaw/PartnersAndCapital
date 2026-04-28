"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { replies: number };
}

interface TicketDetail extends Ticket {
  replies: {
    id: string;
    message: string;
    createdAt: string;
    user: { id: string; name: string | null; role: string };
  }[];
}

const CATEGORIES = [
  { value: "Account", label: "Account" },
  { value: "Documents", label: "Documents" },
  { value: "Investments", label: "Investments" },
  { value: "Technical", label: "Technical" },
  { value: "Other", label: "Other" },
];

function statusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return "border-blue-300 text-blue-700 bg-blue-50";
    case "IN_PROGRESS":
      return "border-amber-300 text-amber-700 bg-amber-50";
    case "RESOLVED":
      return "border-green-300 text-green-700 bg-green-50";
    case "CLOSED":
      return "border-gray-300 text-gray-600 bg-gray-50";
    default:
      return "border-gray-300 text-gray-600 bg-gray-50";
  }
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Ticket detail dialog
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/support");
      if (!res.ok) throw new Error("Failed to load tickets");
      const json = await res.json();
      setTickets(json.tickets);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchTickets());
  }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!subject || !message) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          category: category || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubject("");
      setMessage("");
      setCategory("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      fetchTickets();
    } catch {
      // handle silently
    } finally {
      setSubmitting(false);
    }
  };

  const openTicket = async (ticketId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/portal/support/${ticketId}`);
      if (!res.ok) throw new Error("Failed to load ticket");
      const json = await res.json();
      setSelectedTicket(json);
    } catch {
      // handle silently
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage || !selectedTicket) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/portal/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (!res.ok) throw new Error("Failed to reply");
      setReplyMessage("");
      // Refresh ticket detail
      openTicket(selectedTicket.id);
    } catch {
      // handle silently
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
          Support
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Submit a request or check the status of an existing ticket.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* New Ticket Form */}
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">
            New Ticket
          </h2>

          {submitSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-4">
              Ticket submitted successfully.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Subject</Label>
              <Input
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white border-[#e8e0d4]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger className="bg-white border-[#e8e0d4]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Message</Label>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="bg-white border-[#e8e0d4]"
              />
            </div>

            <Button
              className="w-full bg-[#0f1c2e] hover:bg-[#1a2d45] text-white"
              onClick={handleSubmit}
              disabled={submitting || !subject || !message}
            >
              {submitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Submit Ticket
            </Button>
          </div>
        </div>

        {/* Previous Tickets */}
        <div>
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">
            Your Tickets
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#e8e0d4] p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e8e0d4] p-6 text-center py-12">
              <MessageSquare className="h-10 w-10 text-[#d4c5a9] mx-auto mb-3" />
              <p className="text-sm text-[#6b7280]">
                No tickets yet. Submit one using the form.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket.id)}
                  className="w-full text-left bg-white rounded-xl border border-[#e8e0d4] p-4 hover:bg-[#faf8f5] transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm text-[#1a1a1a]">
                      {ticket.subject}
                    </p>
                    <Badge
                      className={cn(
                        "text-[10px] font-medium border ml-2 shrink-0",
                        statusBadge(ticket.status)
                      )}
                    >
                      {ticket.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#9a8c7a]">
                    <span>{formatDate(ticket.createdAt)}</span>
                    {ticket.category && (
                      <>
                        <span>&middot;</span>
                        <span>{ticket.category}</span>
                      </>
                    )}
                    {ticket._count.replies > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>
                          {ticket._count.replies} repl
                          {ticket._count.replies !== 1 ? "ies" : "y"}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog
        open={!!selectedTicket}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-[#9a8c7a]">Loading...</div>
          ) : selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-[#9a8c7a]">
                <Badge
                  className={cn(
                    "text-[10px] font-medium border",
                    statusBadge(selectedTicket.status)
                  )}
                >
                  {selectedTicket.status.replace(/_/g, " ")}
                </Badge>
                <span>{formatDate(selectedTicket.createdAt)}</span>
                {selectedTicket.category && (
                  <>
                    <span>&middot;</span>
                    <span>{selectedTicket.category}</span>
                  </>
                )}
              </div>

              {/* Original message */}
              <div className="bg-[#faf8f5] rounded-lg p-4">
                <p className="text-sm text-[#4a4a4a] whitespace-pre-wrap">
                  {selectedTicket.message}
                </p>
              </div>

              {/* Replies */}
              {selectedTicket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={cn(
                    "rounded-lg p-4",
                    reply.user.role === "CLIENT"
                      ? "bg-[#faf8f5]"
                      : "bg-blue-50 border border-blue-100"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#1a1a1a]">
                      {reply.user.name || "User"}
                    </span>
                    {reply.user.role !== "CLIENT" && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                        Staff
                      </Badge>
                    )}
                    <span className="text-xs text-[#9a8c7a]">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#4a4a4a] whitespace-pre-wrap">
                    {reply.message}
                  </p>
                </div>
              ))}

              {/* Reply form */}
              {selectedTicket.status !== "CLOSED" && (
                <div className="space-y-3 pt-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    className="bg-white border-[#e8e0d4]"
                  />
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={replying || !replyMessage}
                    className="bg-[#0f1c2e] hover:bg-[#1a2d45]"
                  >
                    {replying && (
                      <Loader2 className="animate-spin mr-2 h-3 w-3" />
                    )}
                    Reply
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

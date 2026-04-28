"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  user: { id: string; name: string | null; email: string };
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

function statusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return "border-[#185fa5]/20 text-[#185fa5] bg-[#e6f1fb]";
    case "IN_PROGRESS":
      return "border-[#7A5520]/20 text-[#7A5520] bg-[#FDF5E8]";
    case "RESOLVED":
      return "border-[#3b6d11]/20 text-[#3b6d11] bg-[#eaf3de]";
    case "CLOSED":
      return "border-gray-300 text-gray-600 bg-gray-50";
    default:
      return "border-gray-300 text-gray-600 bg-gray-50";
  }
}

function priorityBadge(priority: string) {
  switch (priority) {
    case "HIGH":
      return "border-[#a32d2d]/20 text-[#a32d2d] bg-[#feecec]";
    case "MEDIUM":
      return "border-amber-300 text-amber-700 bg-amber-50";
    case "LOW":
      return "border-gray-300 text-gray-600 bg-gray-50";
    default:
      return "border-gray-300 text-gray-600 bg-gray-50";
  }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Detail dialog
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      const res = await fetch(`/api/admin/support?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setTickets(json.tickets);
      setTotal(json.total);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    Promise.resolve().then(() => fetchTickets());
  }, [fetchTickets]);

  const openTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setSelectedTicket(json);
    } catch {
      // handle silently
    }
  };

  const handleReply = async () => {
    if (!replyMessage || !selectedTicket) return;
    setReplying(true);
    try {
      await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });
      setReplyMessage("");
      openTicket(selectedTicket.id);
      fetchTickets();
    } catch {
      // handle silently
    } finally {
      setReplying(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedTicket?.id === ticketId) {
        openTicket(ticketId);
      }
      fetchTickets();
    } catch {
      // handle silently
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a18]">Support Tickets</h1>
        <p className="text-sm text-[#5f5e5a] mt-1">
          {total} total ticket{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v === "all" ? "" : v ?? "")}
        >
          <SelectTrigger className="w-[160px] bg-white border-[#dfdedd]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v === "all" ? "" : v ?? "")}
        >
          <SelectTrigger className="w-[160px] bg-white border-[#dfdedd]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-[#dfdedd] p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#dfdedd] p-6 text-center py-12">
          <MessageSquare className="h-10 w-10 text-[#888780] mx-auto mb-3" />
          <p className="text-sm text-[#5f5e5a]">No tickets found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#dfdedd] divide-y divide-[#eeece8]">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => openTicket(ticket.id)}
              className="w-full text-left px-5 py-4 hover:bg-[#f5f5f3] transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-medium text-sm text-[#1a1a18]">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-[#888780]">
                    {ticket.user.name || ticket.user.email} &middot;{" "}
                    {formatDate(ticket.createdAt)}
                    {ticket.category && ` \u00b7 ${ticket.category}`}
                    {ticket._count.replies > 0 &&
                      ` \u00b7 ${ticket._count.replies} replies`}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0 ml-4">
                  <Badge
                    className={cn(
                      "text-[10px] font-medium border",
                      statusBadge(ticket.status)
                    )}
                  >
                    {ticket.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    className={cn(
                      "text-[10px] font-medium border",
                      priorityBadge(ticket.priority)
                    )}
                  >
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

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

          {selectedTicket && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-[#888780] flex-wrap">
                <span>
                  {selectedTicket.user.name || selectedTicket.user.email}
                </span>
                <span>&middot;</span>
                <span>{formatDate(selectedTicket.createdAt)}</span>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(v) => {
                    if (v) updateTicketStatus(selectedTicket.id, v);
                  }}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="h-6 w-auto text-[10px] border-[#dfdedd]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-[#f5f5f3] rounded-lg p-4">
                <p className="text-sm text-[#5f5e5a] whitespace-pre-wrap">
                  {selectedTicket.message}
                </p>
              </div>

              {selectedTicket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={cn(
                    "rounded-lg p-4",
                    reply.user.role === "CLIENT"
                      ? "bg-[#f5f5f3]"
                      : "bg-[#e6f1fb] border border-[#185fa5]/15"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-[#1a1a18]">
                      {reply.user.name || "User"}
                    </span>
                    {reply.user.role !== "CLIENT" && (
                      <Badge className="text-[10px] bg-[#e6f1fb] text-[#185fa5] border-blue-200">
                        Staff
                      </Badge>
                    )}
                    <span className="text-xs text-[#888780]">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#5f5e5a] whitespace-pre-wrap">
                    {reply.message}
                  </p>
                </div>
              ))}

              <div className="space-y-3 pt-2">
                <Textarea
                  placeholder="Type your reply..."
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
                  {replying && (
                    <Loader2 className="animate-spin mr-2 h-3 w-3" />
                  )}
                  Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

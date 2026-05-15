"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface VerificationItem {
  id: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NOT_STARTED", label: "Not Started" },
];

function statusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "APPROVED":
      return "default";
    case "SUBMITTED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

export default function AdminVerificationsPage() {
  const router = useRouter();
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/admin/verifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.verifications);
        setTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    Promise.resolve().then(() => fetchVerifications());
  }, [fetchVerifications]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verifications</h1>
        <p className="text-muted-foreground mt-1">
          Review client identity and accreditation verifications
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-medium">
            All Verifications
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 w-64"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v || "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No verifications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  verifications.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/verifications/${v.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {v.user.name || "—"}
                      </TableCell>
                      <TableCell>{v.user.email}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(v.status)}>
                          {v.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {v.submittedAt ? formatDate(v.submittedAt) : "—"}
                      </TableCell>
                      <TableCell>{formatDate(v.updatedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

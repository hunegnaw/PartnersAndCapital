"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FolderOpen } from "lucide-react";
import { formatDate, formatDateOnly, cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: string;
  year: number | null;
  description: string | null;
  mimeType: string;
  fileSize: number;
  advisorVisible: boolean;
  investment: { id: string; name: string } | null;
  createdAt: string;
}

interface AdvisorAccess {
  name: string | null;
  type: string | null;
  permissionLevel: string;
  expiresAt: string | null;
}

interface DocumentsResponse {
  documents: Document[];
  categoryCounts: Record<string, number>;
  investmentCounts: { name: string; count: number }[];
  total: number;
  page: number;
  pageSize: number;
  advisorAccess: AdvisorAccess | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  K1: "K-1",
  TAX_1099: "1099",
  QUARTERLY_REPORT: "Quarterly Report",
  ANNUAL_REPORT: "Annual Report",
  CAPITAL_CALL_NOTICE: "Capital Call",
  DISTRIBUTION_NOTICE: "Distribution Notice",
  SUBSCRIPTION_AGREEMENT: "Subscription Agreement",
  PPM: "PPM",
  INVESTOR_LETTER: "Investor Letter",
  OTHER: "Other",
};

const CATEGORY_GROUPS: Record<string, { label: string; types: string[] }> = {
  TAX: {
    label: "Tax Documents",
    types: ["K1", "TAX_1099"],
  },
  REPORTS: {
    label: "Quarterly Reports",
    types: ["QUARTERLY_REPORT", "ANNUAL_REPORT"],
  },
  LEGAL: {
    label: "Legal & Agreements",
    types: ["SUBSCRIPTION_AGREEMENT", "PPM", "INVESTOR_LETTER"],
  },
  CAPITAL: {
    label: "Capital Notices",
    types: ["CAPITAL_CALL_NOTICE", "DISTRIBUTION_NOTICE"],
  },
};

function typeLabel(type: string) {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}

function fileTypeBadge(mimeType: string) {
  if (mimeType?.includes("pdf")) {
    return (
      <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#feecec] text-[#a32d2d] text-[10px] font-bold">
        PDF
      </span>
    );
  }
  if (mimeType?.includes("word") || mimeType?.includes("doc")) {
    return (
      <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#e6f1fb] text-[#185fa5] text-[10px] font-bold">
        DOC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-bold">
      FILE
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function isNew(dateStr: string): boolean {
  const uploaded = new Date(dateStr);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return uploaded > weekAgo;
}

function DocumentSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

// Group documents by their category
function groupDocumentsByCategory(documents: Document[]) {
  const groups: Record<string, Document[]> = {};

  for (const doc of documents) {
    let groupKey = "OTHER";
    for (const [key, group] of Object.entries(CATEGORY_GROUPS)) {
      if (group.types.includes(doc.type)) {
        groupKey = key;
        break;
      }
    }
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(doc);
  }

  return groups;
}

export default function DocumentsPage() {
  const [data, setData] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedInvestment, setSelectedInvestment] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      // Map sidebar category to type filter
      if (selectedCategory !== "all") {
        const group = CATEGORY_GROUPS[selectedCategory];
        if (group) {
          // Use the first type as filter (API will need to handle multiple)
          params.set("type", group.types[0]);
        } else {
          params.set("type", selectedCategory);
        }
      }
      if (selectedYear !== "all") params.set("year", selectedYear);
      if (selectedInvestment !== "all")
        params.set("investment", selectedInvestment);
      params.set("page", String(page));

      const res = await fetch(`/api/portal/documents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load documents");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedYear, selectedInvestment, page]);

  useEffect(() => {
    Promise.resolve().then(() => fetchDocuments());
  }, [fetchDocuments]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const categoryCounts = data?.categoryCounts || {};
  const totalDocuments = Object.values(categoryCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Compute category sidebar counts
  const sidebarCategories = [
    {
      key: "all",
      label: "All Documents",
      count: totalDocuments,
    },
    {
      key: "TAX",
      label: "Tax Documents",
      count: (categoryCounts["K1"] || 0) + (categoryCounts["TAX_1099"] || 0),
    },
    {
      key: "REPORTS",
      label: "Quarterly Reports",
      count:
        (categoryCounts["QUARTERLY_REPORT"] || 0) +
        (categoryCounts["ANNUAL_REPORT"] || 0),
    },
    {
      key: "LEGAL",
      label: "Legal & Agreements",
      count:
        (categoryCounts["SUBSCRIPTION_AGREEMENT"] || 0) +
        (categoryCounts["PPM"] || 0) +
        (categoryCounts["INVESTOR_LETTER"] || 0),
    },
    {
      key: "CAPITAL",
      label: "Capital Notices",
      count:
        (categoryCounts["CAPITAL_CALL_NOTICE"] || 0) +
        (categoryCounts["DISTRIBUTION_NOTICE"] || 0),
    },
  ];

  const investmentCounts = data?.investmentCounts || [];
  const advisorAccess = data?.advisorAccess;

  // Group documents by category for display
  const documents = data?.documents || [];
  const grouped = groupDocumentsByCategory(documents);

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a18]">
          Documents
        </h1>
        <p className="text-[#5f5e5a] text-sm mt-1">
          Everything you need. Nothing buried.
        </p>
      </div>

      {/* CPA Access Banner */}
      {advisorAccess && (
        <div className="bg-white rounded-xl border border-[#dfdedd] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#eeece8] flex items-center justify-center text-xs font-semibold text-[#B07D3A]">
              {advisorAccess.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="text-sm font-medium text-[#1a1a18]">
                {advisorAccess.name} ({advisorAccess.type || "Advisor"}) has
                access to{" "}
                {advisorAccess.permissionLevel === "DASHBOARD_AND_TAX_DOCUMENTS"
                  ? "tax documents"
                  : "all documents"}
              </p>
              <p className="text-xs text-[#888780]">
                View + Download
                {advisorAccess.expiresAt &&
                  ` \u00b7 Expires ${formatDateOnly(advisorAccess.expiresAt)}`}
              </p>
            </div>
          </div>
          <Link
            href="/advisors"
            className="text-xs text-[#B07D3A] hover:underline font-medium shrink-0"
          >
            Manage access
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-56 shrink-0 space-y-6">
          {/* Categories */}
          <div>
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-3">
              Categories
            </p>
            <nav className="space-y-0.5">
              {sidebarCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setPage(1);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                    selectedCategory === cat.key
                      ? "bg-[#f5f5f3] text-[#B07D3A] font-medium"
                      : "text-[#5f5e5a] hover:text-[#1a1a18] hover:bg-[#f5f5f3]"
                  )}
                >
                  <span>{cat.label}</span>
                  <span className="text-xs tabular-nums text-[#888780]">
                    {cat.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* By Investment */}
          {investmentCounts.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-3">
                By Investment
              </p>
              <nav className="space-y-0.5">
                {investmentCounts.map((inv) => (
                  <button
                    key={inv.name}
                    onClick={() => {
                      setSelectedInvestment(
                        selectedInvestment === inv.name ? "all" : inv.name
                      );
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                      selectedInvestment === inv.name
                        ? "bg-[#f5f5f3] text-[#B07D3A] font-medium"
                        : "text-[#5f5e5a] hover:text-[#1a1a18] hover:bg-[#f5f5f3]"
                    )}
                  >
                    <span className="truncate">{inv.name}</span>
                    <span className="text-xs tabular-nums text-[#888780]">
                      {inv.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888780]" />
              <Input
                placeholder="Search documents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-white border-[#dfdedd]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select
                value={selectedYear}
                onValueChange={(val) => {
                  setSelectedYear(val ?? "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-[#dfdedd]">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile category */}
              <div className="lg:hidden">
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => {
                    setSelectedCategory(val ?? "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px] bg-white border-[#dfdedd]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {sidebarCategories.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {cat.label} ({cat.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile investment filter */}
              <div className="lg:hidden">
                <Select
                  value={selectedInvestment}
                  onValueChange={(val) => {
                    setSelectedInvestment(val ?? "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[200px] bg-white border-[#dfdedd]">
                    <SelectValue placeholder="All investments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All investments</SelectItem>
                    {investmentCounts.map((inv) => (
                      <SelectItem key={inv.name} value={inv.name}>
                        {inv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Document List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-[#dfdedd] divide-y divide-[#eeece8]">
              {Array.from({ length: 5 }).map((_, i) => (
                <DocumentSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
              <p className="text-red-600">{error}</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(grouped).map(([groupKey, docs]) => {
                const groupLabel =
                  CATEGORY_GROUPS[groupKey]?.label || "Other Documents";
                return (
                  <div key={groupKey}>
                    <h3 className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-3">
                      {groupLabel}
                    </h3>
                    <div className="bg-white rounded-xl border border-[#dfdedd] divide-y divide-[#eeece8]">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 p-4 hover:bg-[#f5f5f3] transition-colors"
                        >
                          {fileTypeBadge(doc.mimeType)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1a18] truncate">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-[#888780] mt-0.5">
                              <span>Uploaded {formatDate(doc.createdAt)}</span>
                              <span>&middot;</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                            </div>
                            {doc.advisorVisible && (
                              <p className="text-xs text-[#B07D3A] mt-0.5">
                                Visible to CPA
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className="border-[#dfdedd] text-[#5f5e5a] text-[10px]"
                            >
                              {typeLabel(doc.type)}
                            </Badge>
                            {isNew(doc.createdAt) && (
                              <Badge className="bg-[#B07D3A] text-white text-[10px] hover:bg-[#7A5520]">
                                New
                              </Badge>
                            )}
                            <a
                              href={`/api/portal/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#dfdedd] text-[#5f5e5a] text-xs"
                              >
                                Download
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {data && data.total > data.pageSize && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-[#888780]">
                    Showing {(data.page - 1) * data.pageSize + 1}
                    {" - "}
                    {Math.min(data.page * data.pageSize, data.total)} of{" "}
                    {data.total} documents
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="border-[#dfdedd]"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page * data.pageSize >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                      className="border-[#dfdedd]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
              <div className="text-center py-12">
                <FolderOpen className="h-12 w-12 text-[#888780] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#1a1a18] mb-2">
                  No Documents Found
                </h3>
                <p className="text-sm text-[#5f5e5a] max-w-md mx-auto">
                  {search || selectedCategory !== "all" || selectedYear !== "all"
                    ? "No documents match your current filters. Try adjusting your search criteria."
                    : "Documents will appear here once they are uploaded by your advisor."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

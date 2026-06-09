"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Search, FolderOpen, Download, FileText, Loader2 } from "lucide-react";
import { formatDate, formatDateOnly, cn } from "@/lib/utils";
import TaxCenterTab from "./TaxCenterTab";

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
  typeLabels?: Record<string, string>;
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
  STATEMENT: "Statement",
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

function typeLabel(type: string, apiLabels?: Record<string, string>) {
  if (apiLabels && apiLabels[type]) return apiLabels[type];
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

  // Tab state
  const [activeTab, setActiveTab] = useState<string | number>("all-documents");
  const [taxDocuments, setTaxDocuments] = useState<Document[]>([]);
  const [taxTypeLabels, setTaxTypeLabels] = useState<Record<string, string>>({});
  const [taxLoading, setTaxLoading] = useState(false);
  const taxFetchedRef = useRef(false);

  // Statements state
  const [statements, setStatements] = useState<Document[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [statementsYear, setStatementsYear] = useState<string>("all");
  const [selectedStatements, setSelectedStatements] = useState<Set<string>>(new Set());
  const [zipDownloading, setZipDownloading] = useState(false);
  const statementsFetchedRef = useRef(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      // Map sidebar category to type filter
      if (selectedCategory !== "all") {
        const group = CATEGORY_GROUPS[selectedCategory];
        if (group) {
          params.set("category", selectedCategory);
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

  // Fetch tax documents when Tax Center tab is first opened
  useEffect(() => {
    if (activeTab === "tax-center" && !taxFetchedRef.current) {
      taxFetchedRef.current = true;
      setTaxLoading(true);
      fetch("/api/portal/documents?category=TAX&pageSize=500")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load tax documents");
          return res.json();
        })
        .then((json) => {
          setTaxDocuments(json.documents);
          setTaxTypeLabels(json.typeLabels || {});
        })
        .catch(() => {
          // Silently fail - TaxCenterTab will show empty state
        })
        .finally(() => setTaxLoading(false));
    }
  }, [activeTab]);

  // Fetch statements when Statements tab is first opened (merge uploaded docs + generated)
  useEffect(() => {
    if (activeTab === "statements" && !statementsFetchedRef.current) {
      statementsFetchedRef.current = true;
      setStatementsLoading(true);
      Promise.all([
        fetch("/api/portal/documents?type=STATEMENT&pageSize=500").then((r) => r.ok ? r.json() : { documents: [] }),
        fetch("/api/portal/statements").then((r) => r.ok ? r.json() : []),
      ])
        .then(([docData, generatedStatements]) => {
          const uploadedDocs: Document[] = docData.documents || [];
          const generated: Document[] = (generatedStatements as { id: string; fileName: string; periodStart: string; fileSize: number; createdAt: string }[]).map((s) => ({
            id: `stmt-${s.id}`,
            name: s.fileName || "Statement",
            type: "STATEMENT",
            year: new Date(s.periodStart).getFullYear(),
            description: null,
            mimeType: "application/pdf",
            fileSize: s.fileSize || 0,
            advisorVisible: false,
            investment: null,
            createdAt: s.createdAt,
            _statementId: s.id,
          }));
          const merged = [...uploadedDocs, ...generated].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setStatements(merged);
        })
        .catch(() => {})
        .finally(() => setStatementsLoading(false));
    }
  }, [activeTab]);

  async function handleDownloadZip() {
    if (selectedStatements.size === 0) return;
    setZipDownloading(true);
    try {
      const res = await fetch("/api/portal/documents/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedStatements) }),
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "statements.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setZipDownloading(false);
    }
  }

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

  const taxDocCount =
    (categoryCounts["K1"] || 0) + (categoryCounts["TAX_1099"] || 0);
  const statementCount = categoryCounts["STATEMENT"] || 0;

  const filteredStatements = statementsYear === "all"
    ? statements
    : statements.filter((s) => String(s.year) === statementsYear);

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
      count: taxDocCount,
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
                {advisorAccess.permissionLevel === "DASHBOARD_AND_TAX"
                  ? "tax documents"
                  : advisorAccess.permissionLevel === "DASHBOARD_AND_LEGAL"
                    ? "legal documents"
                    : advisorAccess.permissionLevel === "DASHBOARD_AND_REPORTS"
                      ? "reports"
                      : advisorAccess.permissionLevel === "DASHBOARD_TAX_AND_LEGAL"
                        ? "tax and legal documents"
                        : advisorAccess.permissionLevel === "DASHBOARD_TAX_AND_REPORTS"
                          ? "tax documents and reports"
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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList variant="line" className="border-b border-[#eeece8] w-full justify-start gap-0">
          <TabsTrigger
            value="all-documents"
            className="px-4 py-2 text-sm"
          >
            All Documents
          </TabsTrigger>
          <TabsTrigger
            value="tax-center"
            className="px-4 py-2 text-sm gap-2"
          >
            Tax Center
            {taxDocCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[#1A2640] text-white text-[10px] font-semibold">
                {taxDocCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="statements"
            className="px-4 py-2 text-sm gap-2"
          >
            Statements
            {statementCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-[#1A2640] text-white text-[10px] font-semibold">
                {statementCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Documents Tab */}
        <TabsContent value="all-documents" className="mt-4">
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
                                  {typeLabel(doc.type, data?.typeLabels)}
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
        </TabsContent>

        {/* Tax Center Tab */}
        <TabsContent value="tax-center" className="mt-4">
          <TaxCenterTab
            documents={taxDocuments}
            typeLabels={taxTypeLabels}
            loading={taxLoading}
            fileTypeBadge={fileTypeBadge}
            formatFileSize={formatFileSize}
            typeLabel={typeLabel}
          />
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements" className="mt-4">
          {statementsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <DocumentSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Select value={statementsYear} onValueChange={(v) => setStatementsYear(v ?? "all")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {Array.from(new Set(statements.map((s) => s.year).filter(Boolean)))
                        .sort((a, b) => (b as number) - (a as number))
                        .map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedStatements.size > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadZip}
                      disabled={zipDownloading}
                    >
                      {zipDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Download {selectedStatements.size} selected
                    </Button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A]"
                    checked={filteredStatements.length > 0 && selectedStatements.size === filteredStatements.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStatements(new Set(filteredStatements.map((s) => s.id)));
                      } else {
                        setSelectedStatements(new Set());
                      }
                    }}
                  />
                  Select all
                </label>
              </div>

              {/* Statement List */}
              {filteredStatements.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#dfdedd] p-12 text-center">
                  <FileText className="h-10 w-10 mx-auto mb-3 text-[#888780]" />
                  <p className="text-sm text-[#888780]">No statements available yet.</p>
                  <p className="text-xs text-[#888780] mt-1">
                    Statements will appear here as they are generated.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#dfdedd] divide-y divide-[#eeece8]">
                  {filteredStatements.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        selectedStatements.has(doc.id) && "bg-[#FDF5E8]/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#dfdedd] accent-[#B07D3A] shrink-0"
                        checked={selectedStatements.has(doc.id)}
                        onChange={(e) => {
                          const next = new Set(selectedStatements);
                          if (e.target.checked) next.add(doc.id);
                          else next.delete(doc.id);
                          setSelectedStatements(next);
                        }}
                      />
                      {fileTypeBadge(doc.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a1a18] truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-[#888780]">
                          {formatDateOnly(doc.createdAt)}
                          {doc.year ? ` · ${doc.year}` : ""}
                          {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                        </p>
                      </div>
                      <a
                        href={
                          doc.id.startsWith("stmt-")
                            ? `/api/portal/statements/${doc.id.replace("stmt-", "")}/download`
                            : `/api/portal/documents/${doc.id}/download`
                        }
                        className="shrink-0 p-2 rounded-lg hover:bg-[#eeece8] transition-colors text-[#B07D3A]"
                        title="Download"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

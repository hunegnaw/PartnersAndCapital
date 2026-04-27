"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FileText,
  Download,
  Search,
  FolderOpen,
  Filter,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: string;
  year: number | null;
  description: string | null;
  investment: { name: string } | null;
  createdAt: string;
}

interface DocumentsResponse {
  documents: Document[];
  categoryCounts: Record<string, number>;
  total: number;
  page: number;
  pageSize: number;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  K1: "K-1",
  QUARTERLY_REPORT: "Quarterly Report",
  ANNUAL_REPORT: "Annual Report",
  CAPITAL_CALL: "Capital Call",
  DISTRIBUTION_NOTICE: "Distribution Notice",
  TAX_DOCUMENT: "Tax Document",
  SUBSCRIPTION_AGREEMENT: "Subscription Agreement",
  FINANCIAL_STATEMENT: "Financial Statement",
  PPM: "PPM",
  OTHER: "Other",
};

function typeLabel(type: string) {
  return DOCUMENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}

function typeBadgeVariant(type: string) {
  switch (type) {
    case "K1":
    case "TAX_DOCUMENT":
      return "destructive" as const;
    case "QUARTERLY_REPORT":
    case "ANNUAL_REPORT":
      return "default" as const;
    case "CAPITAL_CALL":
    case "DISTRIBUTION_NOTICE":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function DocumentSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div className="flex items-center gap-3 flex-1">
        <Skeleton className="h-9 w-9 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <Skeleton className="h-8 w-8" />
    </div>
  );
}

export default function DocumentsPage() {
  const [data, setData] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedInvestment, setSelectedInvestment] = useState<string>("all");
  const [page, setPage] = useState(1);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedType !== "all") params.set("type", selectedType);
      if (selectedYear !== "all") params.set("year", selectedYear);
      if (selectedInvestment !== "all")
        params.set("investment", selectedInvestment);
      params.set("page", String(page));

      const res = await fetch(`/api/portal/documents?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, selectedYear, selectedInvestment, page]);

  useEffect(() => {
    fetchDocuments();
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

  // Extract unique years and investments for filters
  const years = data?.documents
    ? [...new Set(data.documents.map((d) => d.year).filter(Boolean))]
        .sort((a, b) => (b || 0) - (a || 0))
    : [];

  const investments = data?.documents
    ? [...new Set(data.documents.filter((d) => d.investment).map((d) => d.investment!.name))]
        .sort()
    : [];

  const categoryCounts = data?.categoryCounts || {};
  const totalDocuments = Object.values(categoryCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const categories = [
    { key: "all", label: "All Documents", count: totalDocuments },
    ...Object.entries(categoryCounts).map(([key, count]) => ({
      key,
      label: typeLabel(key),
      count,
    })),
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Access your K-1s, reports, and investment documents
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar - Categories */}
        <div className="hidden lg:block w-56 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <nav className="space-y-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedType(cat.key);
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors text-left",
                      selectedType === cat.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        selectedType === cat.key
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Mobile category filter */}
            <div className="lg:hidden">
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.label} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {years.length > 0 && (
              <Select
                value={selectedYear}
                onValueChange={(val) => {
                  setSelectedYear(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {investments.length > 0 && (
              <Select
                value={selectedInvestment}
                onValueChange={(val) => {
                  setSelectedInvestment(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Investment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investments</SelectItem>
                  {investments.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Document List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <DocumentSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : data && data.documents.length > 0 ? (
            <>
              <div className="space-y-2">
                {data.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {doc.name}
                          </p>
                          <Badge variant={typeBadgeVariant(doc.type)}>
                            {typeLabel(doc.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {doc.year && <span>{doc.year}</span>}
                          {doc.year && doc.investment && (
                            <span>&middot;</span>
                          )}
                          {doc.investment && (
                            <span>{doc.investment.name}</span>
                          )}
                          {(doc.year || doc.investment) && (
                            <span>&middot;</span>
                          )}
                          <span>{formatDate(doc.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <a
                      href={`/api/portal/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 shrink-0"
                    >
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data.total > data.pageSize && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
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
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page * data.pageSize >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Documents Found
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {search || selectedType !== "all" || selectedYear !== "all"
                      ? "No documents match your current filters. Try adjusting your search criteria."
                      : "Documents will appear here once they are uploaded by your advisor."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

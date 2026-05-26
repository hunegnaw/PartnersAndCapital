"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronDown, ChevronRight, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxDocument {
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

interface TaxCenterTabProps {
  documents: TaxDocument[];
  typeLabels: Record<string, string>;
  loading: boolean;
  fileTypeBadge: (mimeType: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  typeLabel: (type: string, apiLabels?: Record<string, string>) => string;
}

function isRecent(dateStr: string): boolean {
  const uploaded = new Date(dateStr);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return uploaded > thirtyDaysAgo;
}

export default function TaxCenterTab({
  documents,
  typeLabels,
  loading,
  fileTypeBadge,
  formatFileSize,
  typeLabel,
}: TaxCenterTabProps) {
  // Extract available years from documents
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    for (const doc of documents) {
      if (doc.year) yearSet.add(doc.year);
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [documents]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showPreviousYears, setShowPreviousYears] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Default to most recent year
  const activeYear = selectedYear ?? years[0] ?? null;

  // Filter documents by selected year
  const docsForYear = useMemo(
    () => documents.filter((d) => d.year === activeYear),
    [documents, activeYear]
  );

  // Group docs by investment
  const investmentGroups = useMemo(() => {
    const groups: Record<string, { name: string; docs: TaxDocument[] }> = {};
    for (const doc of docsForYear) {
      const key = doc.investment?.id || "_personal";
      const name = doc.investment?.name || "Personal";
      if (!groups[key]) groups[key] = { name, docs: [] };
      groups[key].docs.push(doc);
    }
    // Sort by investment name
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [docsForYear]);

  // Count unique investments across all docs
  const totalInvestments = useMemo(() => {
    const investmentSet = new Set<string>();
    for (const doc of docsForYear) {
      investmentSet.add(doc.investment?.id || "_personal");
    }
    return investmentSet.size;
  }, [docsForYear]);

  // Previous years (all years except the active one)
  const previousYears = useMemo(
    () => years.filter((y) => y !== activeYear),
    [years, activeYear]
  );

  // Previous years docs grouped by year then investment
  const previousYearsDocs = useMemo(() => {
    return previousYears.map((year) => {
      const yearDocs = documents.filter((d) => d.year === year);
      return { year, docs: yearDocs };
    });
  }, [documents, previousYears]);

  const handleDownloadAll = useCallback(async () => {
    setDownloading(true);
    for (const doc of docsForYear) {
      const link = document.createElement("a");
      link.href = `/api/portal/documents/${doc.id}/download`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    setDownloading(false);
  }, [docsForYear]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-[#888780] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#1a1a18] mb-2">
            No Tax Documents Yet
          </h3>
          <p className="text-sm text-[#5f5e5a] max-w-md mx-auto">
            K-1 forms are typically available by March 15 for the prior tax year.
            Tax documents will appear here once they are uploaded by your fund administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tax Season Reminder Banner */}
      <div className="bg-[#1A2640] rounded-xl p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5 text-[#B07D3A]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Tax Season Reminder</h3>
            <p className="text-sm text-white/70 mt-1">
              K-1 forms are typically available by March 15. If your CPA needs
              access to these documents, you can grant them view and download
              permissions.
            </p>
            <Link
              href="/advisors"
              className="inline-flex items-center text-[#B07D3A] text-sm font-medium mt-2 hover:underline"
            >
              Grant CPA access
            </Link>
          </div>
        </div>
      </div>

      {/* Summary + Download All */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#5f5e5a]">
          You have{" "}
          <span className="font-medium text-[#1a1a18]">
            {docsForYear.length} tax document{docsForYear.length !== 1 ? "s" : ""}
          </span>{" "}
          across{" "}
          <span className="font-medium text-[#1a1a18]">
            {totalInvestments} investment{totalInvestments !== 1 ? "s" : ""}
          </span>{" "}
          for{" "}
          <span className="font-medium text-[#1a1a18]">{activeYear}</span>
        </p>
        {docsForYear.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-[#dfdedd] text-[#5f5e5a] text-xs gap-1.5"
            onClick={handleDownloadAll}
            disabled={downloading}
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Downloading..." : "Download All"}
          </Button>
        )}
      </div>

      {/* Year Selector Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              year === activeYear
                ? "bg-[#1A2640] text-white"
                : "bg-[#f5f5f3] text-[#5f5e5a] hover:bg-[#eeece8] hover:text-[#1a1a18]"
            )}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Investment Cards Grid */}
      {docsForYear.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investmentGroups.map((group) => (
            <div
              key={group.name}
              className="bg-white rounded-xl border border-[#dfdedd] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#eeece8]">
                <h4 className="text-sm font-semibold text-[#1a1a18]">
                  {group.name}
                </h4>
              </div>
              <div className="divide-y divide-[#eeece8]">
                {group.docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f3] transition-colors"
                  >
                    {fileTypeBadge(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a18] truncate">
                        {typeLabel(doc.type, typeLabels)}
                      </p>
                      <p className="text-xs text-[#888780] mt-0.5">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isRecent(doc.createdAt) ? (
                        <Badge className="bg-[#B07D3A] text-white text-[10px] hover:bg-[#7A5520]">
                          New
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-[#dfdedd] text-[#5f5e5a] text-[10px]"
                        >
                          Available
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
                          className="border-[#dfdedd] text-[#5f5e5a] text-xs h-7 px-2"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#dfdedd] p-6">
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-[#888780] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#1a1a18] mb-1">
              No documents for {activeYear}
            </h3>
            <p className="text-sm text-[#5f5e5a]">
              Tax documents for this year have not been uploaded yet.
            </p>
          </div>
        </div>
      )}

      {/* Previous Years Section */}
      {previousYearsDocs.length > 0 && (
        <div>
          <button
            onClick={() => setShowPreviousYears(!showPreviousYears)}
            className="flex items-center gap-2 text-sm font-medium text-[#5f5e5a] hover:text-[#1a1a18] transition-colors"
          >
            {showPreviousYears ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Previous Years ({previousYearsDocs.length})
          </button>

          {showPreviousYears && (
            <div className="mt-4 space-y-4">
              {previousYearsDocs.map(({ year, docs }) => (
                <div key={year}>
                  <h4 className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-2">
                    {year}
                  </h4>
                  <div className="bg-white rounded-xl border border-[#dfdedd] divide-y divide-[#eeece8]">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f5f5f3] transition-colors"
                      >
                        {fileTypeBadge(doc.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#1a1a18] truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-[#888780]">
                            {doc.investment?.name || "Personal"} &middot;{" "}
                            {typeLabel(doc.type, typeLabels)} &middot;{" "}
                            {formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                        <a
                          href={`/api/portal/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#dfdedd] text-[#5f5e5a] text-xs h-7 px-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

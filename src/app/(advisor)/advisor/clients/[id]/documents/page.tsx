"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateOnly } from "@/lib/utils";

interface DocumentItem {
  id: string;
  title: string;
  docType: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  investmentName: string | null;
}

interface DocumentsData {
  clientName: string;
  documents: DocumentItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docTypeBadge(mimeType: string) {
  const isPdf = mimeType === "application/pdf";
  const isDoc =
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("msword");

  if (isPdf) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200">
        PDF
      </span>
    );
  }
  if (isDoc) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
        DOC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
      FILE
    </span>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <Skeleton className="h-4 w-64 mb-2" />
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e8e0d4] p-5 flex items-center gap-4">
            <Skeleton className="h-8 w-10" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdvisorClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<DocumentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/advisor/clients/${id}/documents`);
      if (!res.ok) {
        if (res.status === 403)
          throw new Error("You do not have document access for this client.");
        throw new Error("Failed to load documents");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => fetchDocs());
  }, [fetchDocs]);

  if (loading) return <DocumentsSkeleton />;

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const documents = data.documents || [];

  return (
    <div className="p-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#9a8c7a]">
        <Link
          href="/advisor/dashboard"
          className="hover:text-[#b8860b] transition-colors"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href={`/advisor/clients/${id}`}
          className="hover:text-[#b8860b] transition-colors"
        >
          {data.clientName}
        </Link>
        <span>/</span>
        <span className="text-[#1a1a1a]">Documents</span>
      </nav>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
          Documents
        </h1>
        <p className="text-sm text-[#9a8c7a] mt-1">
          {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
          available.
        </p>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="border-2 border-dashed border-[#d4c5a9] rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-[#4a4a4a] mb-1">
            No documents available.
          </p>
          <p className="text-sm text-[#9a8c7a]">
            Documents will appear here once they are uploaded for this client.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-[#e8e0d4] p-5 flex items-center gap-4"
            >
              {/* File type badge */}
              <div className="shrink-0">{docTypeBadge(doc.mimeType)}</div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a] truncate">
                  {doc.title}
                </p>
                <p className="text-xs text-[#9a8c7a] mt-0.5">
                  {doc.docType.replace(/_/g, " ")}
                  {doc.investmentName
                    ? ` \u00b7 ${doc.investmentName}`
                    : ""}
                  {" \u00b7 "}
                  {formatDateOnly(doc.createdAt)}
                  {" \u00b7 "}
                  {formatFileSize(doc.fileSize)}
                </p>
              </div>

              {/* Download */}
              <a
                href={`/api/portal/documents/${doc.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-[#b8860b] text-[#b8860b] hover:bg-[#b8860b] hover:text-white transition-colors"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

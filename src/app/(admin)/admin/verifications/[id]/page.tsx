"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Check,
  X,
  Loader2,
  User,
  Shield,
  FileText,
} from "lucide-react";

interface VerificationDetail {
  id: string;
  userId: string;
  status: string;
  legalFirstName: string | null;
  legalLastName: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  idDocumentType: string | null;
  idDocumentPath: string | null;
  idDocumentName: string | null;
  accreditationBasis: string | null;
  accreditationDocType: string | null;
  accreditationDocPath: string | null;
  accreditationDocName: string | null;
  consentAccuracy: boolean;
  consentDataHandling: boolean;
  consentScreening: boolean;
  reviewedAt: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    company: string | null;
    createdAt: string;
  };
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

const ACCREDITATION_LABELS: Record<string, string> = {
  INCOME_INDIVIDUAL: "Individual Income",
  INCOME_JOINT: "Joint Income",
  NET_WORTH: "Net Worth",
  PROFESSIONAL_LICENSE: "Professional License",
  ENTITY_INVESTOR: "Entity Investor",
};

const ID_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Passport",
  DRIVERS_LICENSE: "Driver's License",
  NATIONAL_ID: "National ID",
};

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

export default function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [verification, setVerification] = useState<VerificationDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchVerification = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/verifications/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Verification not found");
        throw new Error("Failed to fetch verification");
      }
      const data = await res.json();
      setVerification(data);
      if (data.reviewNotes) setNotes(data.reviewNotes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => fetchVerification());
  }, [fetchVerification]);

  async function handleAction(action: "approve" | "reject") {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }
      fetchVerification();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error && !verification) {
    return (
      <div className="p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/verifications")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Verifications
        </Button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!verification) return null;

  const canReview = verification.status === "SUBMITTED";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/verifications")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Verifications
          </Button>
          <h1 className="text-2xl font-bold">
            {verification.user.name || verification.user.email}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={statusBadgeVariant(verification.status)}>
              {verification.status.replace("_", " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {verification.user.email}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/admin/clients/${verification.user.id}`)
          }
        >
          <User className="h-4 w-4" />
          View Client
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Identity card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Identity Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <DetailRow
                label="Legal Name"
                value={`${verification.legalFirstName || ""} ${verification.legalLastName || ""}`}
              />
              <DetailRow
                label="Country"
                value={verification.country || "—"}
              />
              <DetailRow
                label="Address"
                value={
                  verification.address
                    ? `${verification.address}, ${verification.city || ""} ${verification.zipCode || ""}`
                    : "—"
                }
              />
              <DetailRow
                label="ID Type"
                value={
                  ID_TYPE_LABELS[verification.idDocumentType || ""] ||
                  verification.idDocumentType ||
                  "—"
                }
              />
              <Separator />
              {verification.idDocumentPath && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{verification.idDocumentName || "ID Document"}</span>
                  </div>
                  <a
                    href={`/api/admin/verifications/${id}/download?type=identity`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accreditation card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Accreditation Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <DetailRow
                label="Basis"
                value={
                  ACCREDITATION_LABELS[
                    verification.accreditationBasis || ""
                  ] ||
                  verification.accreditationBasis ||
                  "—"
                }
              />
              <DetailRow
                label="Document Type"
                value={verification.accreditationDocType || "—"}
              />
              <Separator />
              {verification.accreditationDocPath && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {verification.accreditationDocName ||
                        "Accreditation Document"}
                    </span>
                  </div>
                  <a
                    href={`/api/admin/verifications/${id}/download?type=accreditation`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consent & Timeline */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <ConsentRow
                label="Information accuracy"
                checked={verification.consentAccuracy}
              />
              <ConsentRow
                label="Data processing"
                checked={verification.consentDataHandling}
              />
              <ConsentRow
                label="OFAC screening"
                checked={verification.consentScreening}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <DetailRow
                label="Created"
                value={formatDate(verification.createdAt)}
              />
              {verification.submittedAt && (
                <DetailRow
                  label="Submitted"
                  value={formatDate(verification.submittedAt)}
                />
              )}
              {verification.reviewedAt && verification.reviewedBy && (
                <>
                  <DetailRow
                    label="Reviewed"
                    value={formatDate(verification.reviewedAt)}
                  />
                  <DetailRow
                    label="Reviewed By"
                    value={
                      verification.reviewedBy.name ||
                      verification.reviewedBy.email
                    }
                  />
                </>
              )}
              {verification.reviewNotes && (
                <DetailRow label="Notes" value={verification.reviewNotes} />
              )}
              {verification.rejectionReason && (
                <DetailRow
                  label="Rejection Reason"
                  value={verification.rejectionReason}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin review actions */}
      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add review notes or rejection reason..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction("reject")}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ConsentRow({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      )}
      <span>{label}</span>
    </div>
  );
}

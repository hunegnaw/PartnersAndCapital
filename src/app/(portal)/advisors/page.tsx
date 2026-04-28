"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDate, formatDateOnly, cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface AdvisorAccess {
  permissionLevel: string;
  investmentId: string | null;
  accessStartAt: string | null;
  expiresAt: string | null;
}

interface Advisor {
  id: string;
  name: string;
  email: string;
  firm: string | null;
  advisorType: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  accesses: AdvisorAccess[];
  lastViewedAt: string | null;
}

interface AccessLogEntry {
  action: string;
  details: Record<string, string> | null;
  createdAt: string;
}

interface AdvisorsResponse {
  advisors: Advisor[];
  accessLog: AccessLogEntry[];
}

const ADVISOR_TYPES = [
  { value: "CPA", label: "CPA / Tax Advisor" },
  { value: "FINANCIAL_ADVISOR", label: "Financial Advisor" },
  { value: "ATTORNEY", label: "Attorney" },
  { value: "OTHER", label: "Other" },
];

const PERMISSION_LEVELS = [
  {
    value: "DASHBOARD_ONLY",
    label: "Dashboard only",
    description:
      "Portfolio summary, allocation, and performance numbers. No documents.",
  },
  {
    value: "DASHBOARD_AND_TAX_DOCUMENTS",
    label: "Dashboard + Tax documents",
    description:
      "Best for CPAs. Includes K-1s and 1099s. No legal agreements or reports.",
  },
  {
    value: "DASHBOARD_AND_DOCUMENTS",
    label: "Dashboard + All documents",
    description:
      "Full document vault access. Recommended for financial advisors and family offices.",
  },
  {
    value: "SPECIFIC_INVESTMENT",
    label: "Specific investment only",
    description:
      "Restrict to one deal. Useful for deal-specific attorneys or co-investors.",
  },
];

function getAccessTags(permissionLevel: string): string[] {
  switch (permissionLevel) {
    case "DASHBOARD_ONLY":
      return ["Dashboard"];
    case "DASHBOARD_AND_TAX_DOCUMENTS":
      return ["Dashboard", "K-1s", "1099s"];
    case "DASHBOARD_AND_DOCUMENTS":
      return ["Dashboard", "All documents"];
    case "SPECIFIC_INVESTMENT":
      return ["Specific deal"];
    default:
      return [];
  }
}

function formatAccessLogAction(action: string): string {
  switch (action) {
    case "INVITE_ADVISOR":
      return "Advisor invited";
    case "REVOKE_ADVISOR":
      return "Advisor access revoked";
    case "RESEND_ADVISOR_INVITE":
      return "Invitation resent";
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
}

function AdvisorSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#e8e0d4] p-5">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function AdvisorsPage() {
  const [data, setData] = useState<AdvisorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirm, setInviteFirm] = useState("");
  const [inviteType, setInviteType] = useState("");
  const [invitePermission, setInvitePermission] = useState("DASHBOARD_ONLY");
  const [inviteInvestmentId, setInviteInvestmentId] = useState("");
  const [inviteAccessStart, setInviteAccessStart] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [inviteExpiration, setInviteExpiration] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Revoke dialog state
  const [revokeAdvisor, setRevokeAdvisor] = useState<Advisor | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  const fetchAdvisors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/advisors");
      if (!res.ok) throw new Error("Failed to load advisors");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchAdvisors());
  }, [fetchAdvisors]);

  const handleInvite = useCallback(async () => {
    if (!inviteName || !inviteEmail || !inviteType) {
      setInviteError("Please fill in all required fields");
      return;
    }
    if (invitePermission === "SPECIFIC_INVESTMENT" && !inviteInvestmentId) {
      setInviteError("Please select an investment");
      return;
    }

    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const body: Record<string, string> = {
        name: inviteName,
        email: inviteEmail,
        advisorType: inviteType,
        permissionLevel: invitePermission,
      };
      if (inviteFirm) body.firm = inviteFirm;
      if (inviteInvestmentId) body.investmentId = inviteInvestmentId;
      if (inviteAccessStart) body.accessStartAt = inviteAccessStart;
      if (inviteExpiration) body.expiresAt = inviteExpiration;

      const res = await fetch("/api/portal/advisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to invite advisor");
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteName("");
      setInviteEmail("");
      setInviteFirm("");
      setInviteType("");
      setInvitePermission("DASHBOARD_ONLY");
      setInviteInvestmentId("");
      setInviteAccessStart(new Date().toISOString().split("T")[0]);
      setInviteExpiration("");
      fetchAdvisors();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setInviteLoading(false);
    }
  }, [
    inviteName,
    inviteEmail,
    inviteFirm,
    inviteType,
    invitePermission,
    inviteInvestmentId,
    inviteAccessStart,
    inviteExpiration,
    fetchAdvisors,
  ]);

  const handleRevoke = useCallback(async () => {
    if (!revokeAdvisor) return;
    setRevokeLoading(true);
    setRevokeError("");
    try {
      const res = await fetch(`/api/portal/advisors/${revokeAdvisor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke advisor access");
      }
      setRevokeAdvisor(null);
      fetchAdvisors();
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRevokeLoading(false);
    }
  }, [revokeAdvisor, fetchAdvisors]);

  const handleResend = useCallback(
    async (advisorId: string) => {
      try {
        await fetch(`/api/portal/advisors/${advisorId}/resend`, {
          method: "POST",
        });
        fetchAdvisors();
      } catch {
        // silently handle
      }
    },
    [fetchAdvisors]
  );

  const advisors = data?.advisors || [];
  const accessLog = data?.accessLog || [];
  const activeAdvisors = advisors.filter(
    (a) => a.status === "ACTIVE" || a.status === "PENDING"
  );

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
          Advisor Access
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Manage who can view your portfolio and documents.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column — Invite Form */}
        <div>
          <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">
            Invite an Advisor
          </h2>
          <p className="text-sm text-[#6b7280] mb-6">
            Share visibility with your CPA, financial advisor, or family office
            rep. You control what they see and for how long.
          </p>

          <div className="space-y-4">
            {inviteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            {inviteSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{inviteSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Advisor name</Label>
              <Input
                placeholder="Sarah Ellison"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="bg-white border-[#e8e0d4]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Email address</Label>
              <Input
                type="email"
                placeholder="sarah@taxcpa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-white border-[#e8e0d4]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Advisor type</Label>
              <Select value={inviteType} onValueChange={(v) => setInviteType(v ?? "")}>
                <SelectTrigger className="bg-white border-[#e8e0d4]">
                  <SelectValue placeholder="Select advisor type" />
                </SelectTrigger>
                <SelectContent>
                  {ADVISOR_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#4a4a4a]">Firm (optional)</Label>
              <Input
                placeholder="Ellison Tax Group"
                value={inviteFirm}
                onChange={(e) => setInviteFirm(e.target.value)}
                className="bg-white border-[#e8e0d4]"
              />
            </div>

            {/* Access level radio */}
            <div className="space-y-3">
              <Label className="text-sm text-[#4a4a4a]">Access level</Label>
              <RadioGroup
                value={invitePermission}
                onValueChange={(v) => setInvitePermission(v ?? "DASHBOARD_ONLY")}
              >
                {PERMISSION_LEVELS.map((level) => (
                  <div
                    key={level.value}
                    className={cn(
                      "flex items-start space-x-3 rounded-lg border p-3 transition-colors cursor-pointer",
                      invitePermission === level.value
                        ? "border-[#b8860b] bg-[#faf8f5]"
                        : "border-[#e8e0d4]"
                    )}
                  >
                    <RadioGroupItem
                      value={level.value}
                      id={`perm-${level.value}`}
                      className="mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor={`perm-${level.value}`}
                        className="text-sm font-medium cursor-pointer text-[#1a1a1a]"
                      >
                        {level.label}
                      </Label>
                      <p className="text-xs text-[#9a8c7a] mt-0.5">
                        {level.description}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {invitePermission === "SPECIFIC_INVESTMENT" && (
              <div className="space-y-2">
                <Label className="text-sm text-[#4a4a4a]">Select Investment</Label>
                <Select
                  value={inviteInvestmentId}
                  onValueChange={(v) => setInviteInvestmentId(v ?? "")}
                >
                  <SelectTrigger className="bg-white border-[#e8e0d4]">
                    <SelectValue placeholder="Choose an investment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">
                      Investment options loaded from your portfolio
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm text-[#4a4a4a]">Access start date</Label>
                <DatePicker
                  value={inviteAccessStart}
                  onChange={setInviteAccessStart}
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#4a4a4a]">
                  Expiration date (optional)
                </Label>
                <DatePicker
                  value={inviteExpiration}
                  onChange={setInviteExpiration}
                  placeholder="No expiration"
                  clearable
                />
              </div>
            </div>

            <Button
              className="w-full bg-[#0f1c2e] hover:bg-[#1a2d45] text-white"
              onClick={handleInvite}
              disabled={inviteLoading}
            >
              {inviteLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Send Invitation
            </Button>

            <p className="text-xs text-[#9a8c7a]">
              Advisor will receive a secure link via email. You can revoke access
              at any time.
            </p>
          </div>
        </div>

        {/* Right Column — Active Advisors */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">
              Active Advisors
            </h2>
            <p className="text-sm text-[#6b7280]">
              {activeAdvisors.length} advisor
              {activeAdvisors.length !== 1 ? "s" : ""} currently have access to
              your portfolio.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <AdvisorSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-[#e8e0d4] p-6">
              <p className="text-red-600">{error}</p>
            </div>
          ) : activeAdvisors.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e8e0d4] p-6 text-center py-12">
              <p className="text-sm text-[#6b7280]">
                No advisors have access yet. Use the form to invite your first
                advisor.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAdvisors.map((advisor) => {
                const access = advisor.accesses?.[0];
                const tags = access
                  ? getAccessTags(access.permissionLevel)
                  : [];
                const initials = advisor.name
                  ? advisor.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?";

                return (
                  <div
                    key={advisor.id}
                    className="bg-white rounded-xl border border-[#e8e0d4] p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-sm font-semibold text-white">
                          {initials}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#1a1a1a]">
                            {advisor.name}
                          </h3>
                          <p className="text-xs text-[#6b7280]">
                            {advisor.advisorType?.replace(/_/g, " ")}
                            {advisor.firm && ` \u00b7 ${advisor.firm}`}
                          </p>
                          <p className="text-xs text-[#9a8c7a]">
                            {advisor.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px] font-medium border",
                          advisor.status === "ACTIVE"
                            ? "border-green-300 text-green-700 bg-green-50"
                            : "border-amber-300 text-amber-700 bg-amber-50"
                        )}
                      >
                        {advisor.status === "ACTIVE"
                          ? "Active"
                          : "Invite pending"}
                      </Badge>
                    </div>

                    {/* Access Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded border border-[#e8e0d4] text-[10px] text-[#6b7280]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Date info */}
                    <p className="text-xs text-[#9a8c7a] mb-3">
                      {advisor.status === "ACTIVE" ? (
                        <>
                          {access?.expiresAt &&
                            `Expires ${formatDateOnly(access.expiresAt)}`}
                          {access?.expiresAt &&
                            advisor.lastViewedAt &&
                            " \u00b7 "}
                          {advisor.lastViewedAt &&
                            `Last viewed ${formatDate(advisor.lastViewedAt)}`}
                          {!access?.expiresAt &&
                            !advisor.lastViewedAt &&
                            `Accepted ${formatDate(advisor.acceptedAt || advisor.invitedAt)}`}
                        </>
                      ) : (
                        <>
                          Invited {formatDate(advisor.invitedAt)} &middot; Not
                          yet accepted
                        </>
                      )}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {advisor.status === "ACTIVE" ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#e8e0d4] text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                            onClick={() => {
                              setRevokeError("");
                              setRevokeAdvisor(advisor);
                            }}
                          >
                            Revoke
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#e8e0d4] text-xs"
                            onClick={() => handleResend(advisor.id)}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                            onClick={() => {
                              setRevokeError("");
                              setRevokeAdvisor(advisor);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Access Log */}
          {accessLog.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3">
                Access Log
              </h3>
              <div className="bg-white rounded-xl border border-[#e8e0d4] divide-y divide-[#f5f0e8]">
                {accessLog.map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <p className="text-sm text-[#4a4a4a]">
                      {formatAccessLogAction(entry.action)}
                      {entry.details &&
                        typeof entry.details === "object" &&
                        "email" in entry.details &&
                        ` — ${(entry.details as Record<string, string>).email}`}
                    </p>
                    <p className="text-xs text-[#9a8c7a] shrink-0 ml-4">
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!revokeAdvisor}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeAdvisor(null);
            setRevokeError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Advisor Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for{" "}
              <strong>{revokeAdvisor?.name}</strong> ({revokeAdvisor?.email})?
              They will immediately lose access to your portal.
            </DialogDescription>
          </DialogHeader>

          {revokeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{revokeError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevokeAdvisor(null);
                setRevokeError("");
              }}
              disabled={revokeLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeLoading}
            >
              {revokeLoading && <Loader2 className="animate-spin" />}
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

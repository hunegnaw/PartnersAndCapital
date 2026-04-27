"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  UserPlus,
  Users,
  Mail,
  Building2,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdvisorAccess {
  permissionLevel: string;
  investmentId: string | null;
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
}

interface AdvisorsResponse {
  advisors: Advisor[];
}

const ADVISOR_TYPES = [
  { value: "CPA", label: "CPA" },
  { value: "FINANCIAL_ADVISOR", label: "Financial Advisor" },
  { value: "ATTORNEY", label: "Attorney" },
  { value: "OTHER", label: "Other" },
];

const PERMISSION_LEVELS = [
  {
    value: "DASHBOARD_ONLY",
    label: "Dashboard Only",
    description: "Can view portfolio summary and performance metrics",
  },
  {
    value: "DASHBOARD_AND_DOCUMENTS",
    label: "Dashboard & Documents",
    description: "Can view portfolio and download documents",
  },
  {
    value: "SPECIFIC_INVESTMENT",
    label: "Specific Investment",
    description: "Access limited to a single investment",
  },
];

function advisorTypeBadgeVariant(type: string) {
  switch (type) {
    case "CPA":
      return "default" as const;
    case "FINANCIAL_ADVISOR":
      return "secondary" as const;
    case "ATTORNEY":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function statusIcon(status: string) {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
    case "ACCEPTED":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "PENDING":
    case "INVITED":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "REVOKED":
    case "EXPIRED":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function AdvisorSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
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
      if (!res.ok) {
        throw new Error("Failed to load advisors");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvisors();
  }, [fetchAdvisors]);

  const handleInvite = useCallback(async () => {
    if (!inviteName || !inviteEmail || !inviteType) {
      setInviteError("Please fill in all required fields");
      return;
    }

    if (
      invitePermission === "SPECIFIC_INVESTMENT" &&
      !inviteInvestmentId
    ) {
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
      setInviteExpiration("");
      fetchAdvisors();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "An error occurred"
      );
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
      setRevokeError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setRevokeLoading(false);
    }
  }, [revokeAdvisor, fetchAdvisors]);

  const advisors = data?.advisors || [];

  const permissionLabel = (level: string) => {
    const found = PERMISSION_LEVELS.find((p) => p.value === level);
    return found ? found.label : level.replace(/_/g, " ");
  };

  const advisorTypeLabel = (type: string) => {
    const found = ADVISOR_TYPES.find((t) => t.value === type);
    return found ? found.label : type.replace(/_/g, " ");
  };

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advisors</h1>
        <p className="text-muted-foreground">
          Manage advisor access to your investment portal
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Advisor
            </CardTitle>
            <CardDescription>
              Grant your advisor access to view your investment information
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="advisor-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="advisor-name"
                  placeholder="John Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advisor-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="advisor-email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advisor-firm">Firm</Label>
                <Input
                  id="advisor-firm"
                  placeholder="Smith & Associates"
                  value={inviteFirm}
                  onChange={(e) => setInviteFirm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Advisor Type <span className="text-destructive">*</span>
                </Label>
                <Select value={inviteType} onValueChange={setInviteType}>
                  <SelectTrigger>
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

              <Separator />

              <div className="space-y-3">
                <Label>Permission Level</Label>
                <RadioGroup
                  value={invitePermission}
                  onValueChange={setInvitePermission}
                >
                  {PERMISSION_LEVELS.map((level) => (
                    <div
                      key={level.value}
                      className="flex items-start space-x-3 rounded-lg border border-border p-3"
                    >
                      <RadioGroupItem
                        value={level.value}
                        id={`perm-${level.value}`}
                        className="mt-0.5"
                      />
                      <div>
                        <Label
                          htmlFor={`perm-${level.value}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {level.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {level.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {invitePermission === "SPECIFIC_INVESTMENT" && (
                <div className="space-y-2">
                  <Label>Select Investment</Label>
                  <Select
                    value={inviteInvestmentId}
                    onValueChange={setInviteInvestmentId}
                  >
                    <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="advisor-expiration">
                  Access Expiration (optional)
                </Label>
                <Input
                  id="advisor-expiration"
                  type="date"
                  value={inviteExpiration}
                  onChange={(e) => setInviteExpiration(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for no expiration
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Invitation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Active Advisors */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Active Advisors</h2>
            {advisors.length > 0 && (
              <Badge variant="secondary">{advisors.length}</Badge>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <AdvisorSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          ) : advisors.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No Advisors Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite your CPA, financial advisor, or attorney to view your
                    investment information.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {advisors.map((advisor) => (
                <Card key={advisor.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                            <span className="text-sm font-medium">
                              {advisor.name?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">
                              {advisor.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {advisor.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {statusIcon(advisor.status)}
                          <span className="text-xs text-muted-foreground capitalize">
                            {advisor.status?.toLowerCase()}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={advisorTypeBadgeVariant(advisor.advisorType)}>
                          {advisorTypeLabel(advisor.advisorType)}
                        </Badge>
                        {advisor.firm && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {advisor.firm}
                          </span>
                        )}
                      </div>

                      {/* Permissions */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        {advisor.accesses && advisor.accesses.length > 0
                          ? advisor.accesses
                              .map((a) => permissionLabel(a.permissionLevel))
                              .join(", ")
                          : "No permissions set"}
                      </div>

                      {/* Dates */}
                      <div className="text-xs text-muted-foreground">
                        Invited {formatDate(advisor.invitedAt)}
                        {advisor.acceptedAt && (
                          <> &middot; Accepted {formatDate(advisor.acceptedAt)}</>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setRevokeError("");
                            setRevokeAdvisor(advisor);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Revoke Access
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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

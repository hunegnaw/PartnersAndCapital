"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TwoFactorInput } from "@/components/auth/two-factor-input";
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertCircle,
  KeyRound,
  Copy,
  Download,
  CheckCircle2,
} from "lucide-react";

interface TwoFactorManageProps {
  onDisabled: () => void;
  disableDisabled?: boolean;
}

export function TwoFactorManage({ onDisabled, disableDisabled }: TwoFactorManageProps) {
  // Disable dialog state
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [disableCodeSent, setDisableCodeSent] = useState(false);

  // Regenerate backup codes state
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenCode, setRegenCode] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState("");
  const [regenIsBackupMode, setRegenIsBackupMode] = useState(false);
  const [regenCodeSent, setRegenCodeSent] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showNewCodes, setShowNewCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendDisableCode = useCallback(async () => {
    setDisableLoading(true);
    setDisableError("");

    try {
      const response = await fetch("/api/portal/settings/two-factor/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send code");
      }

      setDisableCodeSent(true);
    } catch (err) {
      setDisableError(
        err instanceof Error ? err.message : "Failed to send code"
      );
    } finally {
      setDisableLoading(false);
    }
  }, []);

  const handleDisable = useCallback(async () => {
    if (!disableCode) {
      setDisableError("Please enter your verification code");
      return;
    }

    setDisableLoading(true);
    setDisableError("");

    try {
      const response = await fetch("/api/portal/settings/two-factor/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disable 2FA");
      }

      setDisableOpen(false);
      setDisableCode("");
      onDisabled();
    } catch (err) {
      setDisableError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setDisableLoading(false);
    }
  }, [disableCode, onDisabled]);

  const handleSendRegenCode = useCallback(async () => {
    setRegenLoading(true);
    setRegenError("");

    try {
      const response = await fetch("/api/portal/settings/two-factor/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send code");
      }

      setRegenCodeSent(true);
    } catch (err) {
      setRegenError(
        err instanceof Error ? err.message : "Failed to send code"
      );
    } finally {
      setRegenLoading(false);
    }
  }, []);

  const handleRegenerateCodes = useCallback(async () => {
    if (!regenCode) {
      setRegenError("Please enter your verification code");
      return;
    }

    setRegenLoading(true);
    setRegenError("");

    try {
      const response = await fetch("/api/portal/settings/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: regenCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Invalid verification code");
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setShowNewCodes(true);
    } catch (err) {
      setRegenError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setRegenLoading(false);
    }
  }, [regenCode]);

  const handleCopyBackupCodes = useCallback(async () => {
    const codesText = backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = codesText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [backupCodes]);

  const handleDownloadBackupCodes = useCallback(() => {
    const codesText = [
      "Partners + Capital - Two-Factor Authentication Backup Codes",
      "=".repeat(55),
      "",
      "Keep these codes in a safe place. Each code can only be used once.",
      "",
      ...backupCodes.map(
        (code, i) => `${(i + 1).toString().padStart(2, " ")}. ${code}`
      ),
      "",
      `Generated: ${new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/New_York",
      }).format(new Date())} ET`,
    ].join("\n");

    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  const resetDisableDialog = useCallback(() => {
    setDisableCode("");
    setDisableError("");
    setIsBackupMode(false);
    setDisableCodeSent(false);
  }, []);

  const resetRegenDialog = useCallback(() => {
    setRegenCode("");
    setRegenError("");
    setRegenIsBackupMode(false);
    setRegenCodeSent(false);
    setBackupCodes([]);
    setShowNewCodes(false);
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <ShieldCheck className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription className="mt-1">
                  Your account is protected with SMS verification
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-[#eaf3de] text-[#3b6d11] dark:bg-green-900/30 dark:text-green-400">
              Enabled
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetRegenDialog();
                setRegenOpen(true);
              }}
            >
              <KeyRound />
              Regenerate Backup Codes
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={disableDisabled}
              onClick={() => {
                resetDisableDialog();
                setDisableOpen(true);
              }}
              title={disableDisabled ? "Required by your organization" : undefined}
            >
              <ShieldOff />
              {disableDisabled ? "Required by organization" : "Disable 2FA"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disable 2FA Dialog */}
      <Dialog
        open={disableOpen}
        onOpenChange={(open) => {
          setDisableOpen(open);
          if (!open) resetDisableDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              {disableCodeSent
                ? "Enter the verification code sent to your phone. This will make your account less secure."
                : "We will send a verification code to your phone to confirm this action."}
            </DialogDescription>
          </DialogHeader>

          {disableError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{disableError}</AlertDescription>
            </Alert>
          )}

          {disableCodeSent ? (
            <>
              <div className="py-2">
                <TwoFactorInput
                  value={disableCode}
                  onChange={setDisableCode}
                  disabled={disableLoading}
                  autoFocus
                  showBackupOption
                  isBackupMode={isBackupMode}
                  onBackupMode={setIsBackupMode}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDisableOpen(false);
                    resetDisableDialog();
                  }}
                  disabled={disableLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={disableLoading || !disableCode}
                >
                  {disableLoading && <Loader2 className="animate-spin" />}
                  Disable 2FA
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDisableOpen(false);
                  resetDisableDialog();
                }}
                disabled={disableLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSendDisableCode}
                disabled={disableLoading}
              >
                {disableLoading && <Loader2 className="animate-spin" />}
                Send code
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog
        open={regenOpen}
        onOpenChange={(open) => {
          setRegenOpen(open);
          if (!open) resetRegenDialog();
        }}
      >
        <DialogContent className={showNewCodes ? "sm:max-w-md" : undefined}>
          <DialogHeader>
            <DialogTitle>
              {showNewCodes ? "New Backup Codes" : "Regenerate Backup Codes"}
            </DialogTitle>
            <DialogDescription>
              {showNewCodes
                ? "Your previous backup codes have been invalidated. Save these new codes in a safe place."
                : regenCodeSent
                  ? "Enter the verification code sent to your phone. This will invalidate all existing backup codes."
                  : "We will send a verification code to your phone to confirm this action."}
            </DialogDescription>
          </DialogHeader>

          {regenError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{regenError}</AlertDescription>
            </Alert>
          )}

          {!showNewCodes ? (
            regenCodeSent ? (
              <>
                <div className="py-2">
                  <TwoFactorInput
                    value={regenCode}
                    onChange={setRegenCode}
                    disabled={regenLoading}
                    autoFocus
                    showBackupOption
                    isBackupMode={regenIsBackupMode}
                    onBackupMode={setRegenIsBackupMode}
                  />
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegenOpen(false);
                      resetRegenDialog();
                    }}
                    disabled={regenLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRegenerateCodes}
                    disabled={regenLoading || !regenCode}
                  >
                    {regenLoading && <Loader2 className="animate-spin" />}
                    Regenerate
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRegenOpen(false);
                    resetRegenDialog();
                  }}
                  disabled={regenLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendRegenCode}
                  disabled={regenLoading}
                >
                  {regenLoading && <Loader2 className="animate-spin" />}
                  Send code
                </Button>
              </DialogFooter>
            )
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/50 p-4">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="rounded bg-background px-2 py-1.5 text-center text-sm font-mono tracking-wider"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBackupCodes}
                  className="flex-1"
                >
                  {copied ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <Copy />
                  )}
                  {copied ? "Copied" : "Copy codes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadBackupCodes}
                  className="flex-1"
                >
                  <Download />
                  Download
                </Button>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setRegenOpen(false);
                    resetRegenDialog();
                  }}
                >
                  <CheckCircle2 />
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

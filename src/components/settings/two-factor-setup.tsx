"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TwoFactorInput } from "@/components/auth/two-factor-input";
import {
  ShieldCheck,
  Loader2,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  QrCode,
  ArrowRight,
} from "lucide-react";

type Step = "intro" | "qr" | "verify" | "backup";

interface TwoFactorSetupProps {
  onComplete: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps) {
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // QR step state
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Verify step state
  const [verifyCode, setVerifyCode] = useState("");

  // Backup codes step state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSetupStart = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/portal/settings/two-factor/setup", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initialize 2FA setup");
      }

      const data = await response.json();
      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setStep("qr");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = useCallback(async () => {
    if (verifyCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/portal/settings/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Invalid verification code");
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setStep("backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [verifyCode]);

  const handleCopyBackupCodes = useCallback(async () => {
    const codesText = backupCodes.join("\n");
    try {
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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
      "=" .repeat(55),
      "",
      "Keep these codes in a safe place. Each code can only be used once.",
      "",
      ...backupCodes.map((code, i) => `${(i + 1).toString().padStart(2, " ")}. ${code}`),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {step === "intro" && "Add an extra layer of security to your account"}
          {step === "qr" && "Step 1 of 3: Scan the QR code"}
          {step === "verify" && "Step 2 of 3: Verify your setup"}
          {step === "backup" && "Step 3 of 3: Save your backup codes"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step: Intro */}
        {step === "intro" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication adds an additional layer of security to your
              account by requiring a verification code from your phone in addition to
              your password.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <QrCode className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Authenticator app</p>
                  <p className="text-sm text-muted-foreground">
                    Use Google Authenticator, Authy, or any TOTP-compatible app to
                    generate verification codes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Backup codes</p>
                  <p className="text-sm text-muted-foreground">
                    You will receive 10 one-time backup codes in case you lose access to
                    your authenticator app.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: QR Code */}
        {step === "qr" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app, or enter the secret key
              manually.
            </p>

            <div className="flex justify-center rounded-lg border border-border bg-white p-4">
              {qrCodeUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrCodeUrl}
                  alt="Two-factor authentication QR code"
                  className="size-48"
                  draggable={false}
                />
              ) : (
                <div className="flex size-48 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Manual entry key
              </Label>
              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
                <code className="select-all break-all text-xs font-mono tracking-wider">
                  {secret}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Step: Verify */}
        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code from your authenticator app to verify the setup.
            </p>

            <div className="py-2">
              <TwoFactorInput
                value={verifyCode}
                onChange={setVerifyCode}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step: Backup Codes */}
        {step === "backup" && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Save your backup codes</AlertTitle>
              <AlertDescription>
                These codes can be used to access your account if you lose your
                authenticator device. Each code can only be used once. Store them
                somewhere safe.
              </AlertDescription>
            </Alert>

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

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                checked={codesSaved}
                onCheckedChange={(checked) => setCodesSaved(checked === true)}
                id="codes-saved"
              />
              <Label htmlFor="codes-saved" className="text-sm cursor-pointer">
                I have saved my backup codes in a safe place
              </Label>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end gap-2">
        {step === "intro" && (
          <Button onClick={handleSetupStart} disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ShieldCheck />
            )}
            Set up two-factor authentication
          </Button>
        )}

        {step === "qr" && (
          <Button onClick={() => setStep("verify")}>
            Next
            <ArrowRight />
          </Button>
        )}

        {step === "verify" && (
          <Button
            onClick={handleVerify}
            disabled={loading || verifyCode.length !== 6}
          >
            {loading && <Loader2 className="animate-spin" />}
            Verify
          </Button>
        )}

        {step === "backup" && (
          <Button onClick={onComplete} disabled={!codesSaved}>
            <CheckCircle2 />
            Done
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

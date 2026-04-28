"use client";

import { useState, useRef, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";

function TwoFactorInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (!/^\d?$/.test(char)) return;
      const newDigits = [...digits];
      newDigits[index] = char;
      const newCode = newDigits.join("");
      onChange(newCode.replace(/\s/g, ""));
      if (char && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        onChange(pasted);
        const focusIndex = Math.min(pasted.length, 5);
        inputRefs.current[focusIndex]?.focus();
      }
    },
    [onChange]
  );

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          className="w-12 h-14 text-center text-xl font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("2FA_REQUIRED") || result.error.includes("two-factor") || result.error.includes("2FA")) {
          setStep("2fa");
        } else {
          setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
        }
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const code = useBackupCode ? backupCode.trim() : twoFactorCode;
    if (!code) {
      setError("Please enter a code");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        twoFactorCode: code,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid verification code" : result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setLoading(true);
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch {
      // Ignore — the point is to re-trigger the SMS send
    } finally {
      setLoading(false);
    }
  }

  if (step === "2fa") {
    return (
      <div>
        <div className="mb-8">
          <button
            onClick={() => {
              setStep("credentials");
              setTwoFactorCode("");
              setBackupCode("");
              setError("");
              setUseBackupCode(false);
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Two-factor authentication</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {useBackupCode
              ? "Enter one of your backup codes to sign in."
              : "We sent a 6-digit code to your phone number on file."}
          </p>
        </div>

        <form onSubmit={handleTwoFactor} className="space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {useBackupCode ? (
            <div>
              <Label htmlFor="backupCode">Backup code</Label>
              <Input
                id="backupCode"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                placeholder="xxxx-xxxx"
                className="mt-1 font-mono text-center"
                autoFocus
                disabled={loading}
              />
            </div>
          ) : (
            <TwoFactorInput
              value={twoFactorCode}
              onChange={setTwoFactorCode}
              disabled={loading}
            />
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>

          <div className="text-center space-y-1">
            {!useBackupCode && (
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-foreground underline block mx-auto"
              >
                Resend code
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {useBackupCode ? "Use SMS code instead" : "Use a backup code instead"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your credentials to access the investor portal
        </p>
      </div>

      <form onSubmit={handleCredentials} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="mt-1"
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="mt-1"
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Not a client?{" "}
          <a href="mailto:info@partnersandcapital.com" className="text-primary hover:underline">
            Request access
          </a>
        </p>
      </form>
    </div>
  );
}

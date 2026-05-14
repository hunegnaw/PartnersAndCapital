"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";

interface StatsData {
  totalDeployed: string;
  avgNetReturn: string;
  assetClassCount: number;
  clientCount: number;
  investmentCount: number;
}

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
    <div className="flex gap-2" onPaste={handlePaste}>
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
          className="w-10 h-11 text-center text-base font-medium border border-[#dfdedd] rounded-md bg-[#fafaf8] text-[#1a1a18] focus:outline-none focus:border-[#B07D3A] disabled:opacity-50"
        />
      ))}
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      <div className={`w-1.5 h-1.5 rounded-full ${step >= 1 ? "bg-[#B07D3A]" : "bg-[#dfdedd]"}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${step >= 2 ? "bg-[#B07D3A]" : "bg-[#dfdedd]"}`} />
      <div className={`w-1.5 h-1.5 rounded-full ${step >= 3 ? "bg-[#B07D3A]" : "bg-[#dfdedd]"}`} />
      <span className="text-[11px] text-[#888780] ml-1">
        {step === 1 ? "Sign in" : step === 2 ? "Password" : "2FA verification"}
      </span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [step, setStep] = useState<"email" | "password" | "2fa">("email");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);

  // Request access modal state
  const [accessOpen, setAccessOpen] = useState(searchParams.get("requestAccess") === "true");
  const [accessName, setAccessName] = useState("");
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPhone, setAccessPhone] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [accessSuccess, setAccessSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError("");
    setStep("password");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
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
        const session = await getSession();
        const role = session?.user?.role;
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          router.push("/admin");
        } else if (role === "ADVISOR") {
          router.push("/advisor/dashboard");
        } else {
          router.push("/dashboard");
        }
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
        const session = await getSession();
        const role = session?.user?.role;
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          router.push("/admin");
        } else if (role === "ADVISOR") {
          router.push("/advisor/dashboard");
        } else {
          router.push("/dashboard");
        }
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

  async function handleAccessRequest(e: React.FormEvent) {
    e.preventDefault();
    setAccessError("");
    setAccessLoading(true);

    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accessName,
          email: accessEmail,
          phone: accessPhone || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit request");
      }

      setAccessSuccess(true);
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setAccessLoading(false);
    }
  }

  // --- Right panel content ---
  function renderRightPanel() {
    if (step === "2fa") {
      return (
        <>
          <StepIndicator step={3} />
          <h2 className="text-lg font-medium text-[#1a1a18] mb-1">Access your portfolio</h2>
          <p className="text-[13px] text-[#5f5e5a] mb-7">
            {useBackupCode
              ? "Enter one of your backup codes to sign in."
              : "Enter the 6-digit code sent to your device."}
          </p>

          <form onSubmit={handleTwoFactor} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs text-[#5f5e5a] mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-3 py-2.5 text-[13px] border border-[#dfdedd] rounded-md bg-[#fafaf8] text-[#1a1a18] focus:outline-none"
              />
            </div>

            {useBackupCode ? (
              <div>
                <label className="text-xs text-[#5f5e5a] mb-1.5 block">Backup code</label>
                <input
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  placeholder="xxxx-xxxx"
                  autoFocus
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-[13px] border border-[#dfdedd] rounded-md bg-[#fafaf8] text-[#1a1a18] font-mono text-center focus:outline-none focus:border-[#B07D3A] disabled:opacity-50"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs text-[#5f5e5a] mb-1.5 block">Verification code</label>
                <TwoFactorInput
                  value={twoFactorCode}
                  onChange={setTwoFactorCode}
                  disabled={loading}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1A2640] text-white text-[13px] font-medium rounded-md hover:bg-[#2C3E5C] disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Log In
            </button>

            <div className="flex justify-between mt-3.5">
              {!useBackupCode && (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-xs text-[#888780] hover:text-[#B07D3A] cursor-pointer"
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
                className="text-xs text-[#888780] hover:text-[#B07D3A] cursor-pointer ml-auto"
              >
                {useBackupCode ? "Use SMS code instead" : "Use a different method"}
              </button>
            </div>
          </form>
        </>
      );
    }

    if (step === "password") {
      return (
        <>
          <StepIndicator step={2} />
          <h2 className="text-lg font-medium text-[#1a1a18] mb-1">Access your portfolio</h2>
          <p className="text-[13px] text-[#5f5e5a] mb-7">Enter your password to continue.</p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs text-[#5f5e5a] mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-3 py-2.5 text-[13px] border border-[#dfdedd] rounded-md bg-[#fafaf8] text-[#1a1a18] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#5f5e5a]">Password</label>
                <Link href="/forgot-password" className="text-[11px] text-[#888780] hover:text-[#B07D3A]">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Enter your password"
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] border border-[#dfdedd] rounded-md bg-[#fafaf8] text-[#1a1a18] focus:outline-none focus:border-[#B07D3A] disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1A2640] text-white text-[13px] font-medium rounded-md hover:bg-[#2C3E5C] disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Log In
            </button>

            <div className="flex justify-between mt-3.5">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setError("");
                }}
                className="text-xs text-[#888780] hover:text-[#B07D3A] cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          </form>
        </>
      );
    }

    // Step 1: Email
    return (
      <>
        <StepIndicator step={1} />
        <h2 className="text-lg font-medium text-[#1a1a18] mb-1">Access your portfolio</h2>
        <p className="text-[13px] text-[#5f5e5a] mb-7">Enter your email to get started.</p>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-[#5f5e5a] mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              disabled={loading}
              className="w-full px-3 py-2.5 text-[13px] border border-[#dfdedd] rounded-md bg-[#fafaf8] text-[#1a1a18] focus:outline-none focus:border-[#B07D3A] disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-2.5 bg-[#1A2640] text-white text-[13px] font-medium rounded-md hover:bg-[#2C3E5C] disabled:opacity-50 mt-2"
          >
            Continue
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px] rounded-xl overflow-hidden border border-[#dfdedd] shadow-sm">
        {/* Left panel — Navy branding */}
        <div className="bg-[#1A2640] px-9 py-10 flex flex-col justify-between">
          <div className="text-[13px] font-medium tracking-[0.1em]">
            <span className="text-white">PARTNERS</span>
            <span className="text-[#E8D5B0]"> + CAPITAL</span>
          </div>

          <div>
            <h1
              className="text-[22px] font-medium text-white leading-snug"
              style={{ fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif" }}
            >
              Your capital.<br />A clear view.
            </h1>
            <p className="text-[13px] text-white/45 mt-2">Private markets. Institutional access.</p>
          </div>

          {stats && (
            <div className="flex gap-6">
              <div>
                <p className="text-xl font-medium text-[#E8D5B0]">{stats.totalDeployed}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Deployed</p>
              </div>
              <div>
                <p className="text-xl font-medium text-[#E8D5B0]">{stats.avgNetReturn}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Avg. Net Return</p>
              </div>
              <div>
                <p className="text-xl font-medium text-[#E8D5B0]">{stats.assetClassCount}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Asset Classes</p>
              </div>
            </div>
          )}

          <p className="text-[10px] text-white/20 leading-relaxed">
            Partners + Capital provides access to private market opportunities. All investments carry risk.
            Past performance does not guarantee future results. This portal is for accredited investors only.
          </p>
        </div>

        {/* Right panel — Form */}
        <div className="bg-white px-9 py-10 flex flex-col justify-center">
          {renderRightPanel()}

          {/* Divider + Request access */}
          <hr className="border-t border-[#eee] my-5" />
          <button
            type="button"
            onClick={() => {
              setAccessOpen(true);
              setAccessSuccess(false);
              setAccessError("");
              setAccessName("");
              setAccessEmail("");
              setAccessPhone("");
            }}
            className="w-full py-2.5 text-[12px] text-[#5f5e5a] border border-[#eee] rounded-md hover:border-[#B07D3A] hover:text-[#7A5520] transition-colors"
          >
            Not a client? Request access
          </button>
        </div>
      </div>

      {/* Request Access Dialog */}
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{accessSuccess ? "Request Submitted" : "Request Access"}</DialogTitle>
            <DialogDescription>
              {accessSuccess
                ? "We've received your request. Our team will be in touch."
                : "Fill out the form below and our team will reach out to you."}
            </DialogDescription>
          </DialogHeader>

          {accessSuccess ? (
            <div className="flex flex-col items-center py-4">
              <CheckCircle className="h-10 w-10 text-green-600 mb-3" />
              <p className="text-sm text-muted-foreground text-center">
                Thank you, {accessName}. We&apos;ll contact you at {accessEmail}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAccessRequest} className="space-y-4">
              {accessError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {accessError}
                </div>
              )}

              <div>
                <Label htmlFor="access-name">Full Name</Label>
                <Input
                  id="access-name"
                  value={accessName}
                  onChange={(e) => setAccessName(e.target.value)}
                  required
                  placeholder="John Smith"
                  className="mt-1"
                  disabled={accessLoading}
                />
              </div>

              <div>
                <Label htmlFor="access-email">Email</Label>
                <Input
                  id="access-email"
                  type="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  required
                  placeholder="john@example.com"
                  className="mt-1"
                  disabled={accessLoading}
                />
              </div>

              <div>
                <Label htmlFor="access-phone">Phone (optional)</Label>
                <Input
                  id="access-phone"
                  type="tel"
                  value={accessPhone}
                  onChange={(e) => setAccessPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                  disabled={accessLoading}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={accessLoading}>
                  {accessLoading && <Loader2 className="animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

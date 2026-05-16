"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOrganization } from "@/components/providers/organization-provider";
import { Loader2, CheckCircle, AlertCircle, UserPlus, Eye, EyeOff } from "lucide-react";
import { advisorAcceptFormSchema } from "@/lib/validation";

interface AdvisorInfo {
  name: string | null;
  email: string;
  firm: string | null;
}

interface TokenData {
  advisor: AdvisorInfo;
  client: { name: string | null };
  permissionLevel: string | undefined;
  hasAccount: boolean;
}

export default function AdvisorAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#B07D3A]" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <AdvisorAcceptInner />
    </Suspense>
  );
}

function AdvisorAcceptInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const org = useOrganization();

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [validating, setValidating] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token) {
      setTokenError("No invitation token provided.");
      setValidating(false);
      return;
    }

    try {
      const res = await fetch(`/api/auth/advisor-accept?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        setTokenError(data.error || "Invalid or expired invitation.");
      } else {
        setTokenData(data);
        if (data.advisor.name) {
          setName(data.advisor.name);
        }
      }
    } catch {
      setTokenError("Failed to validate invitation. Please try again.");
    } finally {
      setValidating(false);
    }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(() => validateToken());
  }, [validateToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!tokenData?.hasAccount) {
      const result = advisorAcceptFormSchema.safeParse({ name: name.trim(), password, confirmPassword });
      if (!result.success) {
        const errors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as string;
          if (!errors[key]) errors[key] = issue.message;
        }
        setFieldErrors(errors);
        return;
      }
    }

    setLoading(true);

    try {
      const body: Record<string, string> = { token: token! };
      if (!tokenData?.hasAccount) {
        body.name = name.trim();
        body.password = password;
      }

      const res = await fetch("/api/auth/advisor-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Loading state while validating token
  if (validating) {
    return (
      <div className="max-w-md mx-auto rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1A2640]">{org.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Advisor Invitation</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#B07D3A]" />
          <span className="ml-2 text-sm text-muted-foreground">Validating invitation...</span>
        </div>
      </div>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <div className="max-w-md mx-auto rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1A2640]">{org.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Advisor Invitation</p>
        </div>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <p className="text-sm text-destructive">{tokenError}</p>
          <Link
            href="/login"
            className="inline-block text-sm text-[#B07D3A] hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-md mx-auto rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1A2640]">{org.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Advisor Invitation</p>
        </div>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <p className="font-medium">Invitation accepted!</p>
          <p className="text-sm text-muted-foreground">
            You now have advisor access to {tokenData?.client.name}&apos;s portfolio.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[#1A2640] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1A2640]/90"
          >
            Sign in to your account
          </Link>
        </div>
      </div>
    );
  }

  // Form state
  const permissionLabel = tokenData?.permissionLevel
    ?.replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="max-w-md mx-auto rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1A2640]">{org.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Advisor Invitation</p>
      </div>

      {/* Invitation details */}
      <div className="mb-6 rounded-md border border-[#dfdedd] bg-[#f5f5f3] p-4">
        <div className="flex items-start gap-3">
          <UserPlus className="h-5 w-5 text-[#B07D3A] mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p>
              <span className="font-medium">{tokenData?.client.name}</span> has invited you as an advisor.
            </p>
            {tokenData?.advisor.email && (
              <p className="text-muted-foreground">
                Email: {tokenData.advisor.email}
              </p>
            )}
            {tokenData?.advisor.firm && (
              <p className="text-muted-foreground">
                Firm: {tokenData.advisor.firm}
              </p>
            )}
            {permissionLabel && (
              <p className="text-muted-foreground">
                Access level: {permissionLabel}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {tokenData?.hasAccount ? (
          /* Existing user — just accept */
          <p className="text-sm text-muted-foreground text-center">
            You already have an account. Click below to accept this invitation.
          </p>
        ) : (
          /* New user — registration form */
          <>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => { const { name: _, ...rest } = prev; return rest; }); }}
                required
                className="w-full rounded-md border border-[#dfdedd] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B07D3A] focus:border-[#B07D3A]"
                placeholder="Your full name"
                disabled={loading}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="email-display" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email-display"
                type="email"
                value={tokenData?.advisor.email || ""}
                disabled
                className="w-full rounded-md border border-[#dfdedd] bg-gray-50 px-3 py-2 text-sm text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
                  required
                  minLength={8}
                  className="w-full rounded-md border border-[#dfdedd] px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#B07D3A] focus:border-[#B07D3A]"
                  placeholder="Create a password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#5f5e5a]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => { const { confirmPassword: _, ...rest } = prev; return rest; }); }}
                  required
                  minLength={8}
                  className="w-full rounded-md border border-[#dfdedd] px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#B07D3A] focus:border-[#B07D3A]"
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888780] hover:text-[#5f5e5a]"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[#1A2640] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1A2640]/90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tokenData?.hasAccount ? "Accepting..." : "Creating account..."}
            </span>
          ) : (
            tokenData?.hasAccount ? "Accept Invitation" : "Create Account & Accept"
          )}
        </button>

        <div className="text-center text-sm">
          <Link href="/login" className="text-[#B07D3A] hover:underline">
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

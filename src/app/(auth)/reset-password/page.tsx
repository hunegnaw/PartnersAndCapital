"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOrganization } from "@/components/providers/organization-provider";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#B07D3A]" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const org = useOrganization();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No reset token provided. Please request a new password reset link.");
    }
  }, [token]);

  function validate(): string | null {
    if (password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1A2640]">{org.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Password Reset</p>
        </div>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your password has been reset successfully.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[#1A2640] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1A2640]/90"
          >
            Sign in with your new password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1A2640]">{org.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set a new password</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!token ? (
        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-[#B07D3A] hover:underline">
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-[#dfdedd] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B07D3A] focus:border-[#B07D3A]"
              placeholder="Enter new password"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-[#dfdedd] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B07D3A] focus:border-[#B07D3A]"
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#1A2640] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1A2640]/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </span>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="text-center text-sm">
            <Link href="/login" className="text-[#B07D3A] hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

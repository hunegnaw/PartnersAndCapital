"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrganization } from "@/components/providers/organization-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const org = useOrganization();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("two-factor") || result.error.includes("2FA")) {
          setShowTwoFactor(true);
          setError("");
        } else {
          setError(result.error);
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

  return (
    <div className="rounded-lg border border-border bg-background p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-primary">{org.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your investor portal
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!showTwoFactor ? (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Enter your password"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="twoFactorCode" className="block text-sm font-medium mb-1">
              Two-Factor Authentication Code
            </label>
            <input
              id="twoFactorCode"
              type="text"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-secondary"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : showTwoFactor ? "Verify" : "Sign in"}
        </button>

        <div className="text-center text-sm">
          <Link href="/forgot-password" className="text-secondary hover:underline">
            Forgot your password?
          </Link>
        </div>
      </form>
    </div>
  );
}

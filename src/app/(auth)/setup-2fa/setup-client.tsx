"use client";

import { signOut } from "next-auth/react";
import { TwoFactorSetup } from "@/components/settings/two-factor-setup";
import { ShieldAlert } from "lucide-react";

export function SetupTwoFactorClient() {
  // Enrollment writes `twoFactorEnabled = true` to the database, but the current
  // JWT still carries `requiresTwoFactorSetup: true`. Sign the user out so they
  // log back in cleanly — the new session then runs the real 2FA challenge.
  const handleComplete = () => {
    signOut({ callbackUrl: "/login?setup=complete" });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-lg border border-[#dfdedd] bg-white p-5 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[#B07D3A]" />
        <div>
          <h1 className="text-base font-semibold text-[#1a1a18]">
            Two-factor authentication required
          </h1>
          <p className="mt-1 text-sm text-[#5f5e5a]">
            Your account requires two-factor authentication before you can
            continue. Set it up now to secure your account — you&apos;ll sign in
            again once it&apos;s enabled.
          </p>
        </div>
      </div>

      <TwoFactorSetup onComplete={handleComplete} />
    </div>
  );
}

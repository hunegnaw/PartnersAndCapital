"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function SignOutPage() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="max-w-md mx-auto rounded-lg border border-[#dfdedd] bg-white p-8 shadow-sm text-center">
      <div className="mb-2">
        <div className="h-12 w-12 rounded-full bg-[#1A2640]/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-6 w-6 text-[#1A2640]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3h-9m9 0l-3-3m3 3l-3 3"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-[#1a1a18]">Sign Out</h1>
        <p className="mt-2 text-sm text-[#5f5e5a]">
          Are you sure you want to sign out of your account?
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full py-2.5 bg-[#1A2640] text-white text-sm font-medium rounded-md hover:bg-[#2C3E5C] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign Out
        </button>
        <button
          onClick={() => window.history.back()}
          disabled={loading}
          className="w-full py-2.5 text-sm text-[#5f5e5a] border border-[#dfdedd] rounded-md hover:border-[#B07D3A] hover:text-[#7A5520] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

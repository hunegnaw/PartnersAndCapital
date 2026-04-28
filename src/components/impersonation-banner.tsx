"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner({
  clientName,
  clientId,
}: {
  clientName: string;
  clientId: string;
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function handleExit() {
    setExiting(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      router.push(`/admin/clients/${clientId}`);
    } catch {
      setExiting(false);
    }
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        Viewing as <strong>{clientName}</strong> — Read-only mode
      </span>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-2.5 py-0.5 text-xs font-semibold transition-colors disabled:opacity-50"
      >
        <X className="h-3 w-3" />
        {exiting ? "Exiting..." : "Exit"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BRAND_PALETTE, type BrandColor } from "@/lib/brand-palette";
import { Palette, Copy, Check, Loader2, RefreshCw } from "lucide-react";

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

function ColorSwatch({ color }: { color: BrandColor }) {
  const [copied, setCopied] = useState(false);
  const light = isLightColor(color.hex);

  async function handleCopy() {
    await navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group text-left rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div
        className="h-24 flex items-end justify-between p-3 relative"
        style={{ backgroundColor: color.hex }}
      >
        <span
          className="font-medium text-sm"
          style={{ color: light ? "#1A2640" : "#ffffff" }}
        >
          {color.name}
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check size={16} style={{ color: light ? "#1A2640" : "#ffffff" }} />
          ) : (
            <Copy size={14} style={{ color: light ? "#1A2640" : "#ffffff" }} />
          )}
        </span>
      </div>
      <div className="px-3 py-2 bg-white">
        <p className="text-xs font-mono text-gray-700">{color.hex}</p>
        <p className="text-[10px] text-gray-400">RGB {color.rgb}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{color.usage}</p>
      </div>
    </button>
  );
}

function ScaleStrip({ colors }: { colors: BrandColor[] }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200">
      {colors.map((color) => {
        const light = isLightColor(color.hex);
        return (
          <div
            key={color.hex}
            className="flex-1 h-12 flex items-center justify-center group cursor-pointer relative"
            style={{ backgroundColor: color.hex }}
            onClick={async () => {
              await navigator.clipboard.writeText(color.hex);
            }}
            title={`${color.name} — ${color.hex} — Click to copy`}
          >
            <span
              className="text-[9px] font-mono opacity-80 group-hover:opacity-100 transition-opacity"
              style={{ color: light ? "#1A2640" : "#ffffff" }}
            >
              {color.hex.replace("#", "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function BrandPalettePage() {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (!confirm("This will replace all currently saved colors with the full brand palette. Continue?")) return;
    setSyncing(true);
    setError(null);
    setSynced(false);
    try {
      const res = await fetch("/api/admin/saved-colors/seed", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to sync colors");
      }
      setSynced(true);
      setTimeout(() => setSynced(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSyncing(false);
    }
  }

  // Separate scales from named categories
  const primaryCat = BRAND_PALETTE.find((c) => c.id === "primary");
  const secondaryCat = BRAND_PALETTE.find((c) => c.id === "secondary");
  const goldScale = BRAND_PALETTE.find((c) => c.id === "gold-scale");
  const navyScale = BRAND_PALETTE.find((c) => c.id === "navy-scale");
  const neutralCat = BRAND_PALETTE.find((c) => c.id === "neutral");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brand Palette</h1>
          <p className="text-muted-foreground mt-1">
            Partners + Capital color system reference. Click any swatch to copy the hex value.
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant={synced ? "outline" : "default"}
        >
          {syncing ? (
            <Loader2 className="animate-spin h-4 w-4" />
          ) : synced ? (
            <Check className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {synced ? "Synced" : "Sync to Saved Colors"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {synced && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>All brand colors synced to saved colors palette.</AlertDescription>
        </Alert>
      )}

      {/* Primary Colors */}
      {primaryCat && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{primaryCat.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {primaryCat.colors.map((color) => (
                <ColorSwatch key={color.hex} color={color} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary Colors */}
      {secondaryCat && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{secondaryCat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {secondaryCat.colors.map((color) => (
                <ColorSwatch key={color.hex} color={color} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gold Scale */}
      {goldScale && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{goldScale.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScaleStrip colors={goldScale.colors} />
            <div className="grid grid-cols-7 gap-2">
              {goldScale.colors.map((color) => (
                <ColorSwatch key={color.hex} color={color} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navy Scale */}
      {navyScale && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{navyScale.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScaleStrip colors={navyScale.colors} />
            <div className="grid grid-cols-7 gap-2">
              {navyScale.colors.map((color) => (
                <ColorSwatch key={color.hex} color={color} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Neutral / UI */}
      {neutralCat && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{neutralCat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {neutralCat.colors.map((color) => (
                <ColorSwatch key={color.hex} color={color} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

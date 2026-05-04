"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Check, LayoutTemplate, Palette, Type, Image as ImageIcon, Link2, Plus, Trash2 } from "lucide-react";
import { ColorPicker } from "@/components/admin/color-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import { DEFAULT_FOOTER, mergeFooter, type FooterConfig, type FooterLink } from "@/lib/footer";

const MODULE_LABELS: { key: keyof FooterConfig["modules"]; label: string; description: string }[] = [
  { key: "logo", label: "Logo", description: "Display a logo image in the footer" },
  { key: "navigation", label: "Navigation", description: "Show navigation links" },
  { key: "newsletter", label: "Newsletter", description: "Newsletter signup form" },
  { key: "contact", label: "Contact Info", description: "Email, phone, and address" },
  { key: "tagline", label: "Tagline", description: "Organization tagline text" },
  { key: "copyright", label: "Copyright", description: "Copyright line with year and entity" },
  { key: "disclaimer", label: "Disclaimer", description: "Legal disclaimer text" },
  { key: "legalLinks", label: "Legal Links", description: "Links like Terms of Use, Privacy Policy" },
];

export default function AdminFooterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setFooter(mergeFooter(data.footer));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ footer }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save footer settings");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  function updateModule(key: keyof FooterConfig["modules"], value: boolean) {
    setFooter((prev) => ({
      ...prev,
      modules: { ...prev.modules, [key]: value },
    }));
  }

  function updateField<K extends keyof FooterConfig>(key: K, value: FooterConfig[K]) {
    setFooter((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Footer</h1>
        <p className="text-muted-foreground mt-1">
          Configure the marketing site footer modules, content, and colors.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>Footer settings saved successfully.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Modules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Modules</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {MODULE_LABELS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={footer.modules[key]}
                  onCheckedChange={(checked) => updateModule(key, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Footer Logo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Optional logo displayed in the footer (separate from the header logo). Enable the Logo module above to display it.
            </p>
            <div className="flex items-center gap-3">
              {footer.logoUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={footer.logoUrl}
                    alt="Footer logo"
                    className="h-12 object-contain rounded border bg-gray-100 px-2"
                  />
                  <button
                    type="button"
                    onClick={() => updateField("logoUrl", null)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  Choose image
                </Button>
              )}
            </div>
            <MediaPicker
              open={mediaPickerOpen}
              onClose={() => setMediaPickerOpen(false)}
              onSelect={(m) => {
                updateField("logoUrl", m.filePath);
                setMediaPickerOpen(false);
              }}
              accept="image"
            />
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Content</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="footer-tagline">Tagline</Label>
              <Input
                id="footer-tagline"
                value={footer.tagline}
                onChange={(e) => updateField("tagline", e.target.value)}
                placeholder="Public Access to Private Markets"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="footer-copyright-year">Copyright Start Year</Label>
                <Input
                  id="footer-copyright-year"
                  value={footer.copyrightStartYear}
                  onChange={(e) => updateField("copyrightStartYear", e.target.value)}
                  placeholder="2015"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="footer-copyright-entity">Copyright Entity</Label>
                <Input
                  id="footer-copyright-entity"
                  value={footer.copyrightEntity}
                  onChange={(e) => updateField("copyrightEntity", e.target.value)}
                  placeholder="Partners + Capital, LLC"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Links */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Legal Links</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Links displayed in the footer bottom bar (e.g. Terms of Use, Privacy Policy). Enable the Legal Links module above to display them.
            </p>
            {footer.links.map((link: FooterLink, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const updated = [...footer.links];
                    updated[i] = { ...updated[i], label: e.target.value };
                    updateField("links", updated);
                  }}
                  placeholder="Label (e.g. Terms of Use)"
                  className="flex-1"
                />
                <Input
                  value={link.url}
                  onChange={(e) => {
                    const updated = [...footer.links];
                    updated[i] = { ...updated[i], url: e.target.value };
                    updateField("links", updated);
                  }}
                  placeholder="URL (e.g. /terms or https://...)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    updateField("links", footer.links.filter((_: FooterLink, j: number) => j !== i));
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateField("links", [...footer.links, { label: "", url: "" }]);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Link
            </Button>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Colors</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Background Color</Label>
                <ColorPicker
                  value={footer.backgroundColor}
                  onChange={(hex) => updateField("backgroundColor", hex)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Text Color</Label>
                <ColorPicker
                  value={footer.textColor}
                  onChange={(hex) => updateField("textColor", hex)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Accent Color</Label>
                <ColorPicker
                  value={footer.accentColor}
                  onChange={(hex) => updateField("accentColor", hex)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving && <Loader2 className="animate-spin" />}
            {success ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : (
              "Save Footer Settings"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

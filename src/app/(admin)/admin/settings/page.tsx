"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Loader2,
  Check,
  Palette,
  Mail,
  Shield,
  FileText,
  Type,
  ImageIcon,
  UserCircle,
  Upload,
  Trash2,
} from "lucide-react"
import { MediaPicker } from "@/components/admin/media-picker"
import { GOOGLE_FONTS } from "@/lib/google-fonts"
import {
  TYPOGRAPHY_CATEGORIES,
  DEFAULT_TYPOGRAPHY,
  type TypographySettings,
  type FontSetting,
} from "@/lib/typography"
import { ColorPicker } from "@/components/admin/color-picker"

interface Organization {
  id: string
  name: string
  legalName: string | null
  logoUrl: string | null
  logoScrolledUrl: string | null
  faviconUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  disclaimer: string | null
  privacyPolicy: string | null
  termsOfService: string | null
  twoFactorPolicy: string | null
  typography: TypographySettings | null
}

export default function AdminSettingsPage() {
  const [, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)

  // Form fields
  const [name, setName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoScrolledUrl, setLogoScrolledUrl] = useState("")
  const [faviconUrl, setFaviconUrl] = useState("")
  const [primaryColor, setPrimaryColor] = useState("")
  const [secondaryColor, setSecondaryColor] = useState("")
  const [accentColor, setAccentColor] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [website, setWebsite] = useState("")
  const [address, setAddress] = useState("")
  const [disclaimer, setDisclaimer] = useState("")
  const [privacyPolicy, setPrivacyPolicy] = useState("")
  const [termsOfService, setTermsOfService] = useState("")
  const [twoFactorPolicy, setTwoFactorPolicy] = useState("")
  const [typography, setTypography] = useState<TypographySettings>(DEFAULT_TYPOGRAPHY)
  const [logoPickerOpen, setLogoPickerOpen] = useState(false)
  const [logoScrolledPickerOpen, setLogoScrolledPickerOpen] = useState(false)
  const [faviconPickerOpen, setFaviconPickerOpen] = useState(false)

  // Statement disclosures
  const [disclosures, setDisclosures] = useState<{ id: string; title: string; body: string; sortOrder: number; isActive: boolean }[]>([])
  const [disclosuresLoading, setDisclosuresLoading] = useState(true)
  const [newDiscTitle, setNewDiscTitle] = useState("")
  const [newDiscBody, setNewDiscBody] = useState("")

  useEffect(() => {
    async function fetchSettings() {
      try {
        // Fetch avatar
        fetch("/api/portal/settings")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.profileImageUrl) setAvatarUrl(d.profileImageUrl) })
          .catch(() => {})

        const res = await fetch("/api/admin/settings")
        if (!res.ok) throw new Error("Failed to fetch settings")
        const data: Organization = await res.json()
        setOrg(data)
        setName(data.name || "")
        setLegalName(data.legalName || "")
        setLogoUrl(data.logoUrl || "")
        setLogoScrolledUrl(data.logoScrolledUrl || "")
        setFaviconUrl(data.faviconUrl || "")
        setPrimaryColor(data.primaryColor || "")
        setSecondaryColor(data.secondaryColor || "")
        setAccentColor(data.accentColor || "")
        setEmail(data.email || "")
        setPhone(data.phone || "")
        setWebsite(data.website || "")
        setAddress(data.address || "")
        setDisclaimer(data.disclaimer || "")
        setPrivacyPolicy(data.privacyPolicy || "")
        setTermsOfService(data.termsOfService || "")
        setTwoFactorPolicy(data.twoFactorPolicy || "OPTIONAL")
        if (data.typography) {
          setTypography({ ...DEFAULT_TYPOGRAPHY, ...data.typography })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()

    async function fetchDisclosures() {
      try {
        const res = await fetch("/api/admin/statements/disclosures")
        if (res.ok) {
          const data = await res.json()
          setDisclosures(data)
        }
      } catch {} finally {
        setDisclosuresLoading(false)
      }
    }
    fetchDisclosures()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          legalName: legalName || null,
          logoUrl: logoUrl || null,
          logoScrolledUrl: logoScrolledUrl || null,
          faviconUrl: faviconUrl || null,
          primaryColor: primaryColor || null,
          secondaryColor: secondaryColor || null,
          accentColor: accentColor || null,
          email: email || null,
          phone: phone || null,
          website: website || null,
          address: address || null,
          disclaimer: disclaimer || null,
          privacyPolicy: privacyPolicy || null,
          termsOfService: termsOfService || null,
          twoFactorPolicy: twoFactorPolicy || null,
          typography,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save settings")
      }

      const updated = await res.json()
      setOrg(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/portal/settings/avatar", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Upload failed")
      }
      const data = await res.json()
      setAvatarUrl(data.profileImageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload avatar")
    } finally {
      setUploadingAvatar(false)
      e.target.value = ""
    }
  }

  async function handleAvatarRemove() {
    setRemovingAvatar(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/settings/avatar", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove avatar")
      setAvatarUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove avatar")
    } finally {
      setRemovingAvatar(false)
    }
  }

  function updateTypographyField(
    category: keyof TypographySettings,
    field: keyof FontSetting,
    value: string
  ) {
    setTypography((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }))
  }

  async function addDisclosure() {
    if (!newDiscTitle || !newDiscBody) return
    try {
      const res = await fetch("/api/admin/statements/disclosures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newDiscTitle, body: newDiscBody }),
      })
      if (res.ok) {
        const d = await res.json()
        setDisclosures([...disclosures, d])
        setNewDiscTitle("")
        setNewDiscBody("")
      }
    } catch {}
  }

  async function updateDisclosure(id: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/statements/disclosures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setDisclosures(disclosures.map((d) => (d.id === id ? { ...d, ...updated } : d)))
      }
    } catch {}
  }

  async function deleteDisclosure(id: string) {
    if (!confirm("Delete this disclosure?")) return
    try {
      await fetch(`/api/admin/statements/disclosures/${id}`, { method: "DELETE" })
      setDisclosures(disclosures.filter((d) => d.id !== id))
    } catch {}
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Organization branding, contact information, and security settings.
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
          <AlertDescription>Settings saved successfully.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-6">
       <Accordion multiple defaultValue={[0, 2]} className="space-y-4">
        {/* Branding */}
        <AccordionItem value="branding" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Branding</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization Name *</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Partners + Capital"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-legal-name">Legal Name</Label>
                <Input
                  id="org-legal-name"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Partners + Capital LLC"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="org-logo">Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="org-logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setLogoPickerOpen(true)}
                    title="Browse media library"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                {logoUrl && (
                  <div className="mt-1 p-2 border rounded bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Logo preview" className="max-h-12 object-contain" />
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-logo-scrolled">Logo (Scrolled)</Label>
                <div className="flex gap-2">
                  <Input
                    id="org-logo-scrolled"
                    value={logoScrolledUrl}
                    onChange={(e) => setLogoScrolledUrl(e.target.value)}
                    placeholder="Logo shown on scrolled header"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setLogoScrolledPickerOpen(true)}
                    title="Browse media library"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                {logoScrolledUrl && (
                  <div className="mt-1 p-2 border rounded bg-[#1A2640]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoScrolledUrl} alt="Scrolled logo preview" className="max-h-12 object-contain" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="org-favicon">Favicon URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="org-favicon"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFaviconPickerOpen(true)}
                    title="Browse media library"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                {faviconUrl && (
                  <div className="mt-1 p-2 border rounded bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faviconUrl} alt="Favicon preview" className="max-h-8 object-contain" />
                  </div>
                )}
              </div>
            </div>

            <MediaPicker
              open={logoPickerOpen}
              onClose={() => setLogoPickerOpen(false)}
              onSelect={(media) => setLogoUrl(media.filePath)}
              accept="image"
            />
            <MediaPicker
              open={logoScrolledPickerOpen}
              onClose={() => setLogoScrolledPickerOpen(false)}
              onSelect={(media) => setLogoScrolledUrl(media.filePath)}
              accept="image"
            />
            <MediaPicker
              open={faviconPickerOpen}
              onClose={() => setFaviconPickerOpen(false)}
              onSelect={(media) => setFaviconUrl(media.filePath)}
              accept="image"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Primary Color</Label>
                <ColorPicker
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
              </div>
              <div className="grid gap-2">
                <Label>Secondary Color</Label>
                <ColorPicker
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
              </div>
              <div className="grid gap-2">
                <Label>Accent Color</Label>
                <ColorPicker
                  value={accentColor}
                  onChange={setAccentColor}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Typography */}
        <AccordionItem value="typography" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Typography</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 space-y-6">
            {TYPOGRAPHY_CATEGORIES.map(({ key, label }) => (
              <div key={key} className="space-y-3 pb-4 border-b border-border last:border-0 last:pb-0">
                <Label className="text-sm font-semibold">{label}</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Font Family</Label>
                    <Select
                      value={typography[key].fontFamily}
                      onValueChange={(v) => v && updateTypographyField(key, "fontFamily", v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map((font) => (
                          <SelectItem key={font} value={font}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <Select
                      value={typography[key].fontWeight}
                      onValueChange={(v) => v && updateTypographyField(key, "fontWeight", v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["100", "200", "300", "400", "500", "600", "700", "800", "900"].map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Style</Label>
                    <Select
                      value={typography[key].fontStyle}
                      onValueChange={(v) => v && updateTypographyField(key, "fontStyle", v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <ColorPicker
                      value={typography[key].color}
                      onChange={(hex) => updateTypographyField(key, "color", hex)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Font Size</Label>
                    <Input
                      value={typography[key].fontSize}
                      onChange={(e) => updateTypographyField(key, "fontSize", e.target.value)}
                      placeholder="16px"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
                <div
                  className="mt-2 p-3 rounded-md border bg-muted/30"
                  style={{
                    fontFamily: typography[key].fontFamily,
                    fontWeight: parseInt(typography[key].fontWeight),
                    fontStyle: typography[key].fontStyle,
                    color: typography[key].color,
                    fontSize: typography[key].fontSize,
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* Contact */}
        <AccordionItem value="contact" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Contact Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="org-email">Email</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-phone">Phone</Label>
                <Input
                  id="org-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="org-website">Website</Label>
                <Input
                  id="org-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-address">Address</Label>
                <Input
                  id="org-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Suite 100, New York, NY 10001"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Compliance */}
        <AccordionItem value="compliance" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Compliance</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="org-disclaimer">Disclaimer</Label>
              <Textarea
                id="org-disclaimer"
                value={disclaimer}
                onChange={(e) => setDisclaimer(e.target.value)}
                placeholder="Investment disclaimer text..."
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-privacy">Privacy Policy URL</Label>
              <Input
                id="org-privacy"
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                placeholder="https://example.com/privacy"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-terms">Terms of Service URL</Label>
              <Input
                id="org-terms"
                value={termsOfService}
                onChange={(e) => setTermsOfService(e.target.value)}
                placeholder="https://example.com/terms"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Security */}
        <AccordionItem value="security" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Security</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 space-y-4">
            <div className="grid gap-2 max-w-sm">
              <Label>Two-Factor Authentication Policy</Label>
              <Select value={twoFactorPolicy} onValueChange={(v) => setTwoFactorPolicy(v ?? "OPTIONAL")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANDATORY">Mandatory - All users must set up SMS two-factor authentication</SelectItem>
                  <SelectItem value="OPTIONAL">Optional - Users can choose to enable SMS two-factor authentication</SelectItem>
                  <SelectItem value="DISABLED">Disabled - Two-factor authentication is turned off for all users</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls whether SMS-based two-factor authentication is required, optional, or disabled for all users.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Profile Avatar */}
        <AccordionItem value="avatar" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Profile Avatar</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt="Profile avatar"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-[#B07D3A] flex items-center justify-center text-2xl font-semibold text-white">
                    <UserCircle className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                    </span>
                  </label>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarRemove}
                      disabled={removingAvatar}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      {removingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or GIF. Max 2MB. Displayed in the header and on your profile.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Statement Disclosures */}
        <AccordionItem value="disclosures" className="border rounded-lg px-6">
          <AccordionTrigger className="py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-base font-semibold">Statement Disclosures</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Disclosures shown at the bottom of client statements. Drag to reorder. Toggle to enable/disable.
            </p>
            {disclosuresLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                {disclosures.map((d) => (
                  <Card key={d.id} className={d.isActive ? "" : "opacity-50"}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Input
                          value={d.title}
                          onChange={(e) => setDisclosures(disclosures.map((x) => x.id === d.id ? { ...x, title: e.target.value } : x))}
                          onBlur={() => updateDisclosure(d.id, { title: d.title })}
                          className="font-semibold text-sm"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateDisclosure(d.id, { isActive: !d.isActive })}
                            title={d.isActive ? "Disable" : "Enable"}
                          >
                            {d.isActive ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDisclosure(d.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={d.body}
                        onChange={(e) => setDisclosures(disclosures.map((x) => x.id === d.id ? { ...x, body: e.target.value } : x))}
                        onBlur={() => updateDisclosure(d.id, { body: d.body })}
                        rows={2}
                        className="text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <Label className="text-sm font-semibold">Add Disclosure</Label>
                    <Input
                      value={newDiscTitle}
                      onChange={(e) => setNewDiscTitle(e.target.value)}
                      placeholder="Disclosure title..."
                    />
                    <Textarea
                      value={newDiscBody}
                      onChange={(e) => setNewDiscBody(e.target.value)}
                      placeholder="Disclosure text..."
                      rows={2}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addDisclosure} disabled={!newDiscTitle || !newDiscBody}>
                      Add Disclosure
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

       </Accordion>

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
              "Save Settings"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

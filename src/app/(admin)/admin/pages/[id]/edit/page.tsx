"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BlockEditor } from "@/components/admin/block-editor"
import { MediaPicker } from "@/components/admin/media-picker"
import { AlertCircle, ArrowLeft, Loader2, ImageIcon, X } from "lucide-react"
import type { PageBlockData } from "@/lib/page-blocks"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function AdminEditPagePage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true)

  // Page fields
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [status, setStatus] = useState("DRAFT")
  const [isHomepage, setIsHomepage] = useState(false)
  const [showInNav, setShowInNav] = useState(false)
  const [navLabel, setNavLabel] = useState("")
  const [navOrder, setNavOrder] = useState(0)
  const [isBlogPage, setIsBlogPage] = useState(false)
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [ogImageUrl, setOgImageUrl] = useState("")
  const [featuredImageUrl, setFeaturedImageUrl] = useState("")
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [mediaPickerTarget, setMediaPickerTarget] = useState<"hero" | "og">("hero")
  const [blocks, setBlocks] = useState<PageBlockData[]>([])

  const fetchPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`)
      if (!res.ok) throw new Error("Failed to fetch page")
      const data = await res.json()
      const page = data.page

      setTitle(page.title)
      setSlug(page.slug)
      setStatus(page.status)
      setIsHomepage(page.isHomepage)
      setShowInNav(page.showInNav || false)
      setNavLabel(page.navLabel || "")
      setNavOrder(page.navOrder || 0)
      setIsBlogPage(page.isBlogPage || false)
      setMetaTitle(page.metaTitle || "")
      setMetaDescription(page.metaDescription || "")
      setOgImageUrl(page.ogImageUrl || "")
      setFeaturedImageUrl(page.featuredImageUrl || "")

      // Map blocks from API response
      if (page.blocks && Array.isArray(page.blocks)) {
        setBlocks(
          page.blocks
            .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
            .map((b: { id: string; type: string; props: Record<string, unknown>; sortOrder: number; mediaId?: string | null }) => ({
              id: b.id,
              type: b.type,
              props: b.props,
              sortOrder: b.sortOrder,
              mediaId: b.mediaId || null,
            }))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page")
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    Promise.resolve().then(() => fetchPage())
  }, [fetchPage])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true)
    setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          status,
          isHomepage,
          showInNav,
          navLabel: navLabel.trim() || null,
          navOrder,
          isBlogPage,
          featuredImageUrl: featuredImageUrl.trim() || null,
          metaTitle: metaTitle.trim() || null,
          metaDescription: metaDescription.trim() || null,
          ogImageUrl: ogImageUrl.trim() || null,
          blocks: blocks.map((b, i) => ({
            id: b.id && !b.id.startsWith("new-") ? b.id : undefined,
            type: b.type,
            props: b.props,
            sortOrder: i,
            mediaId: b.mediaId || null,
          })),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save page")
      }

      router.push("/admin/pages")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/pages"
          className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Page</h1>
          <p className="text-muted-foreground mt-1">
            Update page content and settings.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Main content area — 70% */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Page title"
                    className="text-xl font-semibold"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/</span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="page-slug"
                      className="font-mono text-sm"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Blocks</CardTitle>
              </CardHeader>
              <CardContent>
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — 30% */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val || "DRAFT")}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isHomepage"
                    checked={isHomepage}
                    onCheckedChange={(checked) => setIsHomepage(checked === true)}
                  />
                  <Label htmlFor="isHomepage" className="cursor-pointer">
                    Set as homepage
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isBlogPage"
                    checked={isBlogPage}
                    onCheckedChange={(checked) => setIsBlogPage(checked === true)}
                  />
                  <Label htmlFor="isBlogPage" className="cursor-pointer">
                    Set as blog page
                  </Label>
                </div>
                <hr className="border-border" />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showInNav"
                    checked={showInNav}
                    onCheckedChange={(checked) => setShowInNav(checked === true)}
                  />
                  <Label htmlFor="showInNav" className="cursor-pointer">
                    Show in navigation
                  </Label>
                </div>
                {showInNav && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="navLabel">Nav Label</Label>
                      <Input
                        id="navLabel"
                        value={navLabel}
                        onChange={(e) => setNavLabel(e.target.value)}
                        placeholder="Defaults to page title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="navOrder">Nav Order</Label>
                      <Input
                        id="navOrder"
                        type="number"
                        value={navOrder}
                        onChange={(e) => setNavOrder(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hero Image</CardTitle>
              </CardHeader>
              <CardContent>
                {featuredImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredImageUrl}
                      alt="Hero preview"
                      className="w-full h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFeaturedImageUrl("")}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMediaPickerTarget("hero"); setMediaPickerOpen(true) }}
                    className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#B07D3A] hover:text-[#B07D3A] transition-colors"
                  >
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm">Choose image</span>
                  </button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="SEO title (defaults to page title)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Brief description for search engines"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogImageUrl">OG Image URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="ogImageUrl"
                      value={ogImageUrl}
                      onChange={(e) => setOgImageUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() => { setMediaPickerTarget("og"); setMediaPickerOpen(true) }}
                      className="p-2 border rounded-md hover:bg-gray-50 shrink-0"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {ogImageUrl && (
                    <div className="relative rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ogImageUrl} alt="OG preview" className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => setOgImageUrl("")}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#B07D3A] hover:bg-[#7A5520] text-white"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save Page"}
            </Button>
          </div>
        </div>
      </form>

      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(media) => {
          if (mediaPickerTarget === "og") {
            setOgImageUrl(media.filePath)
          } else {
            setFeaturedImageUrl(media.filePath)
          }
          setMediaPickerOpen(false)
        }}
        accept="image"
      />
    </div>
  )
}

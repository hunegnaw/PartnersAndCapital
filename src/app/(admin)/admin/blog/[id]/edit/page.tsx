"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { RichTextEditor } from "@/components/admin/rich-text-editor"
import { MediaPicker } from "@/components/admin/media-picker"
import {
  ArrowLeft,
  AlertCircle,
  ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Category {
  id: string
  name: string
  slug: string
}

interface Tag {
  id: string
  name: string
  slug: string
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function EditBlogPostPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  // Form state
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManual, setSlugManual] = useState(true) // Editing: default to manual slug
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isDraft, setIsDraft] = useState(true)
  const [heroImageUrl, setHeroImageUrl] = useState("")
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")

  // UI state
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [seoOpen, setSeoOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingPost, setLoadingPost] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = useCallback(async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch("/api/admin/blog/categories"),
        fetch("/api/admin/blog/tags"),
      ])
      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data.categories || [])
      }
      if (tagRes.ok) {
        const data = await tagRes.json()
        setTags(data.tags || [])
      }
    } catch {
      // Non-critical
    }
  }, [])

  const fetchPost = useCallback(async () => {
    setLoadingPost(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/blog/${id}`)
      if (!res.ok) throw new Error("Failed to fetch blog post")
      const data = await res.json()
      const post = data.post || data

      setTitle(post.title || "")
      setSlug(post.slug || "")
      setExcerpt(post.excerpt || "")
      setContent(post.content || "")
      setCategoryId(post.categoryId || "")
      setSelectedTags(post.tags?.map((t: { tag: { id: string } }) => t.tag.id) || [])
      setIsDraft(!post.isPublished)
      setHeroImageUrl(post.heroImageUrl || "")
      setMetaTitle(post.metaTitle || "")
      setMetaDescription(post.metaDescription || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoadingPost(false)
    }
  }, [id])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchOptions()
      fetchPost()
    })
  }, [fetchOptions, fetchPost])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugManual) {
      setSlug(generateSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setSlug(value)
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  async function handleSubmit(asDraft: boolean) {
    setSaving(true)
    setError(null)
    try {
      const body = {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        categoryId: categoryId || null,
        tags: selectedTags,
        isPublished: !asDraft,
        heroImageUrl: heroImageUrl || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      }

      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update blog post")
      }

      router.push("/admin/blog")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleImageRequest(): Promise<string | null> {
    return new Promise((resolve) => {
      const url = window.prompt("Enter image URL:")
      resolve(url)
    })
  }

  if (loadingPost) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/blog"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1A2640]">Edit Blog Post</h1>
          <p className="text-muted-foreground mt-1">
            Update your blog post content and settings.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Main area */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <Input
              placeholder="Post title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-2xl font-semibold h-14 border-gray-200 focus:border-[#B07D3A] focus:ring-[#B07D3A]/20"
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="slug" className="text-sm text-gray-600">
              Slug
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">/blog/</span>
              <Input
                id="slug"
                placeholder="post-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="excerpt" className="text-sm text-gray-600">
              Excerpt
            </Label>
            <Textarea
              id="excerpt"
              placeholder="Brief summary of the post..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          {/* Rich Text Editor */}
          <div>
            <Label className="text-sm text-gray-600 mb-2 block">Content</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              onImageRequest={handleImageRequest}
              placeholder="Write your blog post..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDraft"
                  checked={isDraft}
                  onCheckedChange={(checked) => setIsDraft(checked === true)}
                />
                <Label htmlFor="isDraft" className="text-sm cursor-pointer">
                  Save as draft
                </Label>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={saving || !title}
                  className="w-full bg-[#B07D3A] hover:bg-[#7A5520] text-white"
                >
                  {saving ? "Updating..." : "Update & Publish"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={saving || !title}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save as Draft"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Category card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val === "none" ? "" : val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Tags card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags available.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={() => toggleTag(tag.id)}
                      />
                      <Label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                        {tag.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hero Image card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Hero Image</CardTitle>
            </CardHeader>
            <CardContent>
              {heroImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageUrl}
                    alt="Hero preview"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setHeroImageUrl("")}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#B07D3A] hover:text-[#B07D3A] transition-colors"
                >
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">Choose image</span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* SEO card (collapsible) */}
          <Card>
            <CardHeader className="pb-3">
              <button
                type="button"
                onClick={() => setSeoOpen(!seoOpen)}
                className="flex items-center justify-between w-full"
              >
                <CardTitle className="text-sm font-medium">SEO</CardTitle>
                {seoOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </CardHeader>
            {seoOpen && (
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="metaTitle" className="text-xs text-gray-500">
                    Meta Title
                  </Label>
                  <Input
                    id="metaTitle"
                    placeholder="SEO title (defaults to post title)"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metaTitle.length}/60 characters
                  </p>
                </div>
                <div>
                  <Label htmlFor="metaDescription" className="text-xs text-gray-500">
                    Meta Description
                  </Label>
                  <Textarea
                    id="metaDescription"
                    placeholder="Brief description for search engines..."
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={3}
                    className="mt-1 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metaDescription.length}/160 characters
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Media Picker */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(media) => {
          setHeroImageUrl(media.filePath)
          setMediaPickerOpen(false)
        }}
        accept="image"
      />
    </div>
  )
}

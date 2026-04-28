"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-react"

interface Category {
  id: string
  name: string
  slug: string
  color: string | null
  sortOrder: number
  _count?: {
    posts: number
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [newSlugManual, setNewSlugManual] = useState(false)
  const [newColor, setNewColor] = useState("#B07D3A")
  const [newSortOrder, setNewSortOrder] = useState(0)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editSortOrder, setEditSortOrder] = useState(0)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/blog/categories")
      if (!res.ok) throw new Error("Failed to fetch categories")
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function handleNewNameChange(value: string) {
    setNewName(value)
    if (!newSlugManual) {
      setNewSlug(generateSlug(value))
    }
  }

  function handleNewSlugChange(value: string) {
    setNewSlugManual(true)
    setNewSlug(value)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug || generateSlug(newName),
          color: newColor || null,
          sortOrder: newSortOrder,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create category")
      }
      setNewName("")
      setNewSlug("")
      setNewSlugManual(false)
      setNewColor("#B07D3A")
      setNewSortOrder(0)
      setShowCreate(false)
      fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category")
    } finally {
      setSaving(false)
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditSlug(cat.slug)
    setEditColor(cat.color || "")
    setEditSortOrder(cat.sortOrder)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
    setEditSlug("")
    setEditColor("")
    setEditSortOrder(0)
  }

  async function handleUpdate() {
    if (!editingId || !editName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/blog/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: editSlug,
          color: editColor || null,
          sortOrder: editSortOrder,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update category")
      }
      cancelEdit()
      fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(catId: string) {
    if (deleting) return
    if (!confirm("Are you sure you want to delete this category? Posts using it will become uncategorized.")) return

    setDeleting(catId)
    try {
      const res = await fetch(`/api/admin/blog/categories/${catId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete category")
      fetchCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/blog"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1A2640]">Blog Categories</h1>
            <p className="text-muted-foreground mt-1">
              Manage categories for organizing blog posts.
            </p>
          </div>
        </div>
        {!showCreate && (
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#B07D3A] hover:bg-[#7A5520] text-white"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Inline create form */}
      {showCreate && (
        <Card className="border-[#B07D3A]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <Label htmlFor="newName" className="text-xs text-gray-500">
                  Name
                </Label>
                <Input
                  id="newName"
                  placeholder="Category name"
                  value={newName}
                  onChange={(e) => handleNewNameChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="newSlug" className="text-xs text-gray-500">
                  Slug
                </Label>
                <Input
                  id="newSlug"
                  placeholder="category-slug"
                  value={newSlug}
                  onChange={(e) => handleNewSlugChange(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="newColor" className="text-xs text-gray-500">
                  Color
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    id="newColor"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-9 w-9 rounded border border-gray-200 cursor-pointer"
                  />
                  <Input
                    placeholder="#B07D3A"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="newSortOrder" className="text-xs text-gray-500">
                  Sort Order
                </Label>
                <Input
                  id="newSortOrder"
                  type="number"
                  value={newSortOrder}
                  onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  className="bg-[#B07D3A] hover:bg-[#7A5520] text-white"
                >
                  {saving ? "Creating..." : "Create"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    setNewName("")
                    setNewSlug("")
                    setNewSlugManual(false)
                    setNewColor("#B07D3A")
                    setNewSortOrder(0)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Color</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Sort Order</TableHead>
                <TableHead className="text-center hidden md:table-cell">Posts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-center hidden md:table-cell"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No categories yet. Create your first category to get started.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id}>
                    {editingId === cat.id ? (
                      <>
                        {/* Inline edit mode */}
                        <TableCell>
                          <input
                            type="color"
                            value={editColor || "#cccccc"}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-6 w-6 rounded-full border cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            className="h-8 text-sm font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editSortOrder}
                            onChange={(e) => setEditSortOrder(parseInt(e.target.value) || 0)}
                            className="h-8 text-sm text-center w-20 mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {cat._count?.posts ?? "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleUpdate}
                              disabled={saving}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        {/* Display mode */}
                        <TableCell>
                          <div
                            className="h-6 w-6 rounded-full border border-gray-200"
                            style={{ backgroundColor: cat.color || "#cccccc" }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <code className="text-sm text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded">
                            {cat.slug}
                          </code>
                        </TableCell>
                        <TableCell className="text-center">{cat.sortOrder}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {cat._count?.posts ?? "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(cat)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cat.id)}
                              disabled={deleting === cat.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

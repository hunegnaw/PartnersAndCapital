"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { formatDate } from "@/lib/utils"
import {
  Search,
  Star,
  Pencil,
  Trash2,
  AlertCircle,
  Navigation,
  BookOpen,
  ExternalLink,
} from "lucide-react"

interface PageRecord {
  id: string
  title: string
  slug: string
  status: string
  isHomepage: boolean
  showInNav: boolean
  isBlogPage: boolean
  metaTitle: string | null
  metaDescription: string | null
  updatedAt: string
  _count: {
    blocks: number
  }
}

const statusColor = (status: string) => {
  switch (status) {
    case "PUBLISHED":
      return "bg-[#eaf3de] text-[#3b6d11] border-[#3b6d11]/20"
    case "DRAFT":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "ARCHIVED":
      return "bg-[#feecec] text-[#a32d2d] border-[#a32d2d]/20"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageRecord[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)

      const res = await fetch(`/api/admin/pages?${params}`)
      if (!res.ok) throw new Error("Failed to fetch pages")
      const data = await res.json()
      setPages(data.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    Promise.resolve().then(() => fetchPages())
  }, [fetchPages])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchPages()
  }

  async function handleDelete(pageId: string) {
    if (deleting) return
    if (!confirm("Are you sure you want to delete this page? This cannot be undone.")) return

    setDeleting(pageId)
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete page")
      fetchPages()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete page")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-muted-foreground mt-1">
            Manage website pages and their content blocks.
          </p>
        </div>
        <Link
          href="/admin/pages/new"
          className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white bg-[#B07D3A] hover:bg-[#7A5520] transition-colors"
        >
          New Page
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading..." : `${pages.length} page${pages.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Home</TableHead>
                <TableHead className="text-center">Nav</TableHead>
                <TableHead className="text-center">Blog</TableHead>
                <TableHead className="text-center">Blocks</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-6 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {search
                      ? "No pages match your search."
                      : "No pages yet. Create your first page to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      /{page.slug}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColor(page.status)}
                      >
                        {page.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {page.isHomepage && (
                        <Star className="h-4 w-4 text-[#B07D3A] fill-[#B07D3A] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {page.showInNav && (
                        <Navigation className="h-4 w-4 text-[#185fa5] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {page.isBlogPage && (
                        <BookOpen className="h-4 w-4 text-[#3b6d11] mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {page._count.blocks}
                    </TableCell>
                    <TableCell>{formatDate(page.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={page.isHomepage ? "/" : `/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="View page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <Link
                          href={`/admin/pages/${page.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(page.id)}
                          disabled={deleting === page.id}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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

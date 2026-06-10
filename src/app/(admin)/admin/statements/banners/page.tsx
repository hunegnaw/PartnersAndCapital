"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Send,
  ArrowLeft,
  Archive,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MediaPicker } from "@/components/admin/media-picker"
import Link from "next/link"

interface Banner {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  buttonText: string | null
  buttonUrl: string | null
  gradientFrom: string
  gradientTo: string
  isArchived: boolean
  createdAt: string
  _count: { assignments: number; placements: number }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function BannerPreview({ title, description, imageUrl, buttonText, gradientFrom, gradientTo }: {
  title: string
  description: string | null
  imageUrl: string | null
  buttonText: string | null
  gradientFrom: string
  gradientTo: string
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 6,
        overflow: "hidden",
        height: 120,
        background: `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{ position: "absolute", left: 0, top: 0, width: "45%", height: 120, objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          background: imageUrl
            ? `linear-gradient(to right, transparent 20%, ${gradientTo} 45%)`
            : gradientTo,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "16px 24px",
          paddingLeft: imageUrl ? "40%" : 24,
        }}
      >
        <div style={{ color: "#E8D5B0", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {title || "Banner Title"}
        </div>
        {description && (
          <div style={{ color: "#fff", fontSize: 11, opacity: 0.85, marginBottom: 6, lineHeight: 1.4 }}>
            {description}
          </div>
        )}
        {buttonText && (
          <span
            style={{
              display: "inline-block",
              padding: "6px 16px",
              background: "#B07D3A",
              color: "#fff",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              width: "fit-content",
            }}
          >
            {buttonText}
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Banner form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [buttonText, setButtonText] = useState("Learn More")
  const [buttonUrl, setButtonUrl] = useState("")
  const [gradientFrom, setGradientFrom] = useState("#1A2640")
  const [gradientTo, setGradientTo] = useState("#1A2640")
  const [mediaOpen, setMediaOpen] = useState(false)

  // Assignment state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignBannerId, setAssignBannerId] = useState<string | null>(null)
  const [assignMonths, setAssignMonths] = useState<number[]>([])
  const [assignYears, setAssignYears] = useState<number[]>([new Date().getFullYear()])
  const [assignAllClients, setAssignAllClients] = useState(true)
  const [assignClientIds, setAssignClientIds] = useState<string[]>([])
  const [clients, setClients] = useState<{ id: string; name: string | null; email: string }[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [assigning, setAssigning] = useState(false)

  const [tab, setTab] = useState("library")

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/statements/banners?archived=true")
      if (!res.ok) throw new Error("Failed to fetch banners")
      const data = await res.json()
      setBanners(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banners")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { Promise.resolve().then(fetchBanners) }, [fetchBanners])

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/admin/clients?limit=1000")
        if (res.ok) {
          const data = await res.json()
          setClients((data.clients || data).map((c: { id: string; name: string | null; email: string }) => ({
            id: c.id, name: c.name, email: c.email,
          })))
        }
      } catch {}
    }
    loadClients()
  }, [])

  function resetForm() {
    setTitle("")
    setDescription("")
    setImageUrl("")
    setButtonText("Learn More")
    setButtonUrl("")
    setGradientFrom("#1A2640")
    setGradientTo("#1A2640")
    setEditingId(null)
  }

  function openEditor(banner?: Banner) {
    if (banner) {
      setEditingId(banner.id)
      setTitle(banner.title)
      setDescription(banner.description || "")
      setImageUrl(banner.imageUrl || "")
      setButtonText(banner.buttonText || "Learn More")
      setButtonUrl(banner.buttonUrl || "")
      setGradientFrom(banner.gradientFrom)
      setGradientTo(banner.gradientTo)
    } else {
      resetForm()
    }
    setEditorOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const body = { title, description: description || null, imageUrl: imageUrl || null, buttonText: buttonText || null, buttonUrl: buttonUrl || null, gradientFrom, gradientTo }
      const url = editingId ? `/api/admin/statements/banners/${editingId}` : "/api/admin/statements/banners"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error("Failed to save banner")
      setEditorOpen(false)
      resetForm()
      await fetchBanners()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(id: string, archive: boolean) {
    try {
      await fetch(`/api/admin/statements/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: archive }),
      })
      await fetchBanners()
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this banner permanently?")) return
    try {
      await fetch(`/api/admin/statements/banners/${id}`, { method: "DELETE" })
      await fetchBanners()
    } catch {}
  }

  async function handleAssign() {
    if (!assignBannerId || assignMonths.length === 0 || assignYears.length === 0) return
    setAssigning(true)
    try {
      const body: Record<string, unknown> = { months: assignMonths, years: assignYears }
      if (assignAllClients) body.allClients = true
      else body.clientIds = assignClientIds
      const res = await fetch(`/api/admin/statements/banners/${assignBannerId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Assignment failed")
      setAssignOpen(false)
      await fetchBanners()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed")
    } finally {
      setAssigning(false)
    }
  }

  const activeBanners = banners.filter((b) => !b.isArchived)
  const archivedBanners = banners.filter((b) => b.isArchived)
  const usedBanners = banners.filter((b) => b._count.placements > 0)
  const filteredClients = clients.filter(
    (c) => (c.name || "").toLowerCase().includes(clientSearch.toLowerCase()) || c.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/statements">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Statement Banners</h1>
            <p className="text-muted-foreground mt-1">Create and manage promotional banners for client statements.</p>
          </div>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Banner
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="library">Library ({activeBanners.length})</TabsTrigger>
          <TabsTrigger value="used">Used ({usedBanners.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedBanners.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-4">
          {activeBanners.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No banners yet. Create one to get started.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeBanners.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4 space-y-3">
                    <BannerPreview
                      title={b.title}
                      description={b.description}
                      imageUrl={b.imageUrl}
                      buttonText={b.buttonText}
                      gradientFrom={b.gradientFrom}
                      gradientTo={b.gradientTo}
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{b.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {b._count.assignments} assignment{b._count.assignments !== 1 ? "s" : ""} · {b._count.placements} placement{b._count.placements !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setAssignBannerId(b.id); setAssignMonths([]); setAssignOpen(true) }} title="Assign">
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditor(b)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(b.id, true)} title="Archive">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="used" className="mt-4">
          {usedBanners.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No banners have been used in statements yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {usedBanners.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4 space-y-3">
                    <BannerPreview title={b.title} description={b.description} imageUrl={b.imageUrl} buttonText={b.buttonText} gradientFrom={b.gradientFrom} gradientTo={b.gradientTo} />
                    <div className="text-sm font-medium">{b.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Used in {b._count.placements} statement{b._count.placements !== 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedBanners.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No archived banners.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {archivedBanners.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4 space-y-3">
                    <BannerPreview title={b.title} description={b.description} imageUrl={b.imageUrl} buttonText={b.buttonText} gradientFrom={b.gradientFrom} gradientTo={b.gradientTo} />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{b.title}</span>
                      <Button variant="outline" size="sm" onClick={() => handleArchive(b.id, false)}>Restore</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Banner Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Banner" : "Create Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview</Label>
              <BannerPreview title={title} description={description || null} imageUrl={imageUrl || null} buttonText={buttonText || null} gradientFrom={gradientFrom} gradientTo={gradientTo} />
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New Investment Opportunity" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the banner content..." rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-2">
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => setMediaOpen(true)}>Browse</Button>
                {imageUrl && <Button variant="ghost" size="sm" onClick={() => setImageUrl("")}>Clear</Button>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Learn More" />
              </div>
              <div className="space-y-2">
                <Label>Button URL</Label>
                <Input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gradient Start</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gradient End</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Media Picker */}
      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(media) => { setImageUrl(media.filePath); setMediaOpen(false) }}
      />

      {/* Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Banner to Statements</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Months</Label>
              <div className="grid grid-cols-4 gap-2">
                {MONTH_NAMES.map((m, i) => (
                  <label key={i} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignMonths.includes(i + 1)}
                      onChange={(e) => {
                        if (e.target.checked) setAssignMonths([...assignMonths, i + 1])
                        else setAssignMonths(assignMonths.filter((x) => x !== i + 1))
                      }}
                    />
                    {m.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Years</Label>
              <div className="flex gap-2">
                {[2025, 2026, 2027, 2028].map((y) => (
                  <label key={y} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignYears.includes(y)}
                      onChange={(e) => {
                        if (e.target.checked) setAssignYears([...assignYears, y])
                        else setAssignYears(assignYears.filter((x) => x !== y))
                      }}
                    />
                    {y}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Clients</Label>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignAllClients}
                  onChange={(e) => { setAssignAllClients(e.target.checked); if (e.target.checked) setAssignClientIds([]) }}
                />
                <span className="text-sm">All clients</span>
              </label>
              {!assignAllClients && (
                <>
                  <Input placeholder="Search clients..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                    {filteredClients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignClientIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) setAssignClientIds([...assignClientIds, c.id])
                            else setAssignClientIds(assignClientIds.filter((id) => id !== c.id))
                          }}
                        />
                        {c.name || c.email}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || assignMonths.length === 0}>
              {assigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

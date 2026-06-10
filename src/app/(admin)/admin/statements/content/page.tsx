"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface Investment { id: string; name: string }
interface Commentary { id: string; investmentId: string; month: number; year: number; title: string | null; body: string; investment: { id: string; name: string } }
interface UpcomingDist { id: string; investmentId: string; expectedDate: string; amount: number | null; description: string | null; month: number; year: number; investment: { id: string; name: string } }

export default function StatementContentPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [investments, setInvestments] = useState<Investment[]>([])
  const [commentaries, setCommentaries] = useState<Commentary[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingDist[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Commentary dialog
  const [commOpen, setCommOpen] = useState(false)
  const [commInvId, setCommInvId] = useState("")
  const [commTitle, setCommTitle] = useState("")
  const [commBody, setCommBody] = useState("")

  // Upcoming distribution dialog
  const [distOpen, setDistOpen] = useState(false)
  const [distInvId, setDistInvId] = useState("")
  const [distDate, setDistDate] = useState("")
  const [distAmount, setDistAmount] = useState("")
  const [distDesc, setDistDesc] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [commRes, distRes] = await Promise.all([
        fetch(`/api/admin/statements/commentary?month=${month}&year=${year}`),
        fetch(`/api/admin/statements/upcoming-distributions?month=${month}&year=${year}`),
      ])
      if (commRes.ok) setCommentaries(await commRes.json())
      if (distRes.ok) setUpcoming(await distRes.json())
    } catch {} finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { Promise.resolve().then(fetchData) }, [fetchData])

  useEffect(() => {
    fetch("/api/admin/investments?limit=100").then(async (r) => {
      if (r.ok) {
        const data = await r.json()
        setInvestments((data.investments || data).map((i: { id: string; name: string }) => ({ id: i.id, name: i.name })))
      }
    }).catch(() => {})
  }, [])

  async function saveCommentary() {
    if (!commInvId || !commBody) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/statements/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investmentId: commInvId, month, year, title: commTitle || null, body: commBody }),
      })
      if (res.ok) {
        setCommOpen(false)
        setCommTitle("")
        setCommBody("")
        setCommInvId("")
        await fetchData()
      }
    } catch {} finally { setSaving(false) }
  }

  async function deleteCommentary(id: string) {
    if (!confirm("Delete this commentary?")) return
    await fetch(`/api/admin/statements/commentary/${id}`, { method: "DELETE" })
    await fetchData()
  }

  async function saveUpcoming() {
    if (!distInvId || !distDate) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/statements/upcoming-distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investmentId: distInvId, expectedDate: distDate, amount: distAmount ? parseFloat(distAmount) : null, description: distDesc || null, month, year }),
      })
      if (res.ok) {
        setDistOpen(false)
        setDistDate("")
        setDistAmount("")
        setDistDesc("")
        setDistInvId("")
        await fetchData()
      }
    } catch {} finally { setSaving(false) }
  }

  async function deleteUpcoming(id: string) {
    if (!confirm("Delete this entry?")) return
    await fetch(`/api/admin/statements/upcoming-distributions/${id}`, { method: "DELETE" })
    await fetchData()
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/statements"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Statement Content</h1>
            <p className="text-muted-foreground mt-1">Market commentary and upcoming distributions per investment per period.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => v && setMonth(parseInt(v, 10))}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => v && setYear(parseInt(v, 10))}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? <Skeleton className="h-64" /> : (
        <Tabs defaultValue="commentary">
          <TabsList>
            <TabsTrigger value="commentary">Market Commentary ({commentaries.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Distributions ({upcoming.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="commentary" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCommOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Commentary</Button>
            </div>
            {commentaries.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No commentary for {MONTH_NAMES[month - 1]} {year}. Add commentary to include it in client statements.</CardContent></Card>
            ) : (
              commentaries.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground font-medium">{c.investment.name}</div>
                        {c.title && <div className="font-semibold text-sm mt-1">{c.title}</div>}
                        <div className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">{c.body}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteCommentary(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setDistOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Distribution</Button>
            </div>
            {upcoming.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No upcoming distributions for {MONTH_NAMES[month - 1]} {year}.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Investment</th>
                        <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Expected Date</th>
                        <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
                        <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.map((d) => (
                        <tr key={d.id} className="border-b">
                          <td className="p-3 text-sm font-medium">{d.investment.name}</td>
                          <td className="p-3 text-sm">{new Date(d.expectedDate).toLocaleDateString()}</td>
                          <td className="p-3 text-sm text-right tabular-nums">{d.amount ? `$${d.amount.toLocaleString()}` : "—"}</td>
                          <td className="p-3 text-sm text-muted-foreground">{d.description || "—"}</td>
                          <td className="p-3">
                            <Button variant="ghost" size="sm" onClick={() => deleteUpcoming(d.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Commentary Dialog */}
      <Dialog open={commOpen} onOpenChange={setCommOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Market Commentary</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Investment *</Label>
              <Select value={commInvId} onValueChange={(v) => v && setCommInvId(v)}>
                <SelectTrigger><SelectValue placeholder="Select investment" /></SelectTrigger>
                <SelectContent>
                  {investments.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input value={commTitle} onChange={(e) => setCommTitle(e.target.value)} placeholder="Q2 2026 Update" />
            </div>
            <div className="space-y-2">
              <Label>Commentary *</Label>
              <Textarea value={commBody} onChange={(e) => setCommBody(e.target.value)} rows={4} placeholder="Market conditions, fund performance, outlook..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommOpen(false)}>Cancel</Button>
            <Button onClick={saveCommentary} disabled={saving || !commInvId || !commBody}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upcoming Distribution Dialog */}
      <Dialog open={distOpen} onOpenChange={setDistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Upcoming Distribution</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Investment *</Label>
              <Select value={distInvId} onValueChange={(v) => v && setDistInvId(v)}>
                <SelectTrigger><SelectValue placeholder="Select investment" /></SelectTrigger>
                <SelectContent>
                  {investments.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Date *</Label>
                <Input type="date" value={distDate} onChange={(e) => setDistDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" value={distAmount} onChange={(e) => setDistAmount(e.target.value)} placeholder="50000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={distDesc} onChange={(e) => setDistDesc(e.target.value)} placeholder="Quarterly distribution" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistOpen(false)}>Cancel</Button>
            <Button onClick={saveUpcoming} disabled={saving || !distInvId || !distDate}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

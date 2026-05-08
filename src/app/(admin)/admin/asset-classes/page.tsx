"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Flame,
  Building,
  Landmark,
  Star,
  Briefcase,
  TrendingUp,
  Gem,
  Coins,
  BarChart3,
  Factory,
  Leaf,
  Ship,
  Cpu,
  Heart,
} from "lucide-react";

// ── Icon map ────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Building,
  Landmark,
  Star,
  Briefcase,
  TrendingUp,
  Gem,
  Coins,
  BarChart3,
  Factory,
  Leaf,
  Ship,
  Cpu,
  Heart,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

function AssetClassIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = name ? ICON_MAP[name] : null;
  if (!Icon) return <div className={`rounded bg-gray-100 ${className ?? "w-8 h-8"}`} />;
  return <Icon className={className} />;
}

// ── Types ───────────────────────────────────────────────────────────
interface AssetClass {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  _count: { investments: number };
}

// ── Main page ───────────────────────────────────────────────────────
export default function AssetClassesPage() {
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AssetClass | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/asset-classes");
      if (!res.ok) throw new Error("Failed to load asset classes");
      const data = await res.json();
      setAssetClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
  }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setIcon("");
    setSortOrder(String((assetClasses.length + 1) * 10));
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(ac: AssetClass) {
    setEditing(ac);
    setName(ac.name);
    setDescription(ac.description ?? "");
    setIcon(ac.icon ?? "");
    setSortOrder(String(ac.sortOrder));
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        icon: icon || null,
        sortOrder: parseInt(sortOrder, 10) || 0,
      };

      const url = editing
        ? `/api/admin/asset-classes/${editing.id}`
        : "/api/admin/asset-classes";

      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${editing ? "update" : "create"} asset class`);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(ac: AssetClass) {
    if (
      !confirm(
        ac._count.investments > 0
          ? `"${ac.name}" has ${ac._count.investments} investment(s). You must reassign them before deleting.`
          : `Delete "${ac.name}"? This cannot be undone.`
      )
    )
      return;

    setDeleting(ac.id);
    try {
      const res = await fetch(`/api/admin/asset-classes/${ac.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete asset class");
      }
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Classes</h1>
          <p className="text-muted-foreground mt-1">
            Manage asset class categories used to organize investments.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Asset Class
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-4 py-3 w-10"></th>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Description</th>
                <th className="text-center font-medium px-4 py-3 w-28">Investments</th>
                <th className="text-center font-medium px-4 py-3 w-20">Order</th>
                <th className="text-right font-medium px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3"><div className="w-6 h-6 bg-muted animate-pulse rounded" /></td>
                    <td className="px-4 py-3"><div className="w-32 h-4 bg-muted animate-pulse rounded" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="w-48 h-4 bg-muted animate-pulse rounded" /></td>
                    <td className="px-4 py-3"><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></td>
                    <td className="px-4 py-3"><div className="w-8 h-4 bg-muted animate-pulse rounded mx-auto" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : assetClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-12">
                    No asset classes yet. Click &ldquo;Add Asset Class&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                assetClasses.map((ac) => (
                  <tr
                    key={ac.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <AssetClassIcon
                        name={ac.icon}
                        className="w-5 h-5 text-muted-foreground"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{ac.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-xs">
                      {ac.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {ac._count.investments}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                      {ac.sortOrder}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ac)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ac)}
                          disabled={deleting === ac.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleting === ac.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Asset Class" : "Add Asset Class"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the asset class details."
                  : "Create a new asset class for organizing investments."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {formError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="ac-name">Name *</Label>
                <Input
                  id="ac-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Oil & Gas"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ac-description">Description</Label>
                <Textarea
                  id="ac-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this asset class..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Icon</Label>
                  <Select value={icon} onValueChange={(v) => setIcon(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select icon">
                        {icon ? (
                          <span className="flex items-center gap-2">
                            <AssetClassIcon name={icon} className="w-4 h-4" />
                            {icon}
                          </span>
                        ) : (
                          "Select icon"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((iconName) => (
                        <SelectItem key={iconName} value={iconName}>
                          <span className="flex items-center gap-2">
                            <AssetClassIcon name={iconName} className="w-4 h-4" />
                            {iconName}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ac-sort">Sort Order</Label>
                  <Input
                    id="ac-sort"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {editing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

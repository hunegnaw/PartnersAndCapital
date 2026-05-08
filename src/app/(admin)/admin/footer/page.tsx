"use client";

import { useState, useEffect, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  Loader2,
  Check,
  LayoutTemplate,
  Palette,
  Type,
  Image as ImageIcon,
  Link2,
  Plus,
  Trash2,
  Columns,
  GripVertical,
  FileText,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { ColorPicker } from "@/components/admin/color-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import {
  DEFAULT_FOOTER,
  mergeFooter,
  type FooterConfig,
  type FooterLink,
  type FooterNavColumn,
  type FooterInvestmentLink,
} from "@/lib/footer";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  isHomepage: boolean;
}

interface InvestmentRecord {
  id: string;
  name: string;
}

const MODULE_LABELS: {
  key: keyof FooterConfig["modules"];
  label: string;
  description: string;
}[] = [
  { key: "logo", label: "Logo", description: "Display a logo image in the footer" },
  { key: "navigation", label: "Navigation Columns", description: "Show custom navigation columns" },
  { key: "investments", label: "Investments", description: "Dynamic column listing investments" },
  { key: "newsletter", label: "Newsletter", description: "Newsletter signup form" },
  { key: "contact", label: "Contact Info", description: "Email, phone, and address" },
  { key: "tagline", label: "Tagline", description: "Organization tagline text" },
  { key: "copyright", label: "Copyright", description: "Copyright line with year and entity" },
  { key: "disclaimer", label: "Disclaimer", description: "Legal disclaimer text" },
  { key: "legalLinks", label: "Legal Links", description: "Links like Terms of Use, Privacy Policy" },
];

/* ------------------------------------------------------------------ */
/*  Sortable link row within a nav column                             */
/* ------------------------------------------------------------------ */
function SortableLinkRow({
  link,
  linkId,
  onChangeLabel,
  onChangeUrl,
  onDelete,
}: {
  link: FooterLink;
  linkId: string;
  onChangeLabel: (v: string) => void;
  onChangeUrl: (v: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: linkId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 pl-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="shrink-0 text-muted-foreground">
        {link.source === "page" ? (
          <FileText className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
      </div>
      <Input
        value={link.label}
        onChange={(e) => onChangeLabel(e.target.value)}
        placeholder="Label"
        className="flex-1"
      />
      <Input
        value={link.url}
        onChange={(e) => onChangeUrl(e.target.value)}
        placeholder="URL (e.g. /about)"
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page picker popover                                                */
/* ------------------------------------------------------------------ */
function PagePickerPopover({
  pages,
  onSelect,
}: {
  pages: CmsPage[];
  onSelect: (page: CmsPage) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <FileText className="h-4 w-4" />
            Add Page Link
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64 p-0">
        <div className="p-2 border-b">
          <p className="text-xs font-medium text-muted-foreground">Published Pages</p>
        </div>
        <div className="max-h-60 overflow-y-auto">
          {pages.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">No published pages found.</p>
          )}
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
              onClick={() => {
                onSelect(page);
                setOpen(false);
              }}
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{page.title}</span>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                /{page.isHomepage ? "" : page.slug}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable nav column wrapper                                        */
/* ------------------------------------------------------------------ */
function SortableNavColumn({
  columnId,
  children,
}: {
  columnId: string;
  children: (dragHandleProps: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: columnId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-3">
      {children({ attributes, listeners })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main admin page                                                    */
/* ------------------------------------------------------------------ */
export default function AdminFooterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);

  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/footer").then((r) => r.json()),
    ])
      .then(([settingsData, footerData]) => {
        setFooter(mergeFooter(settingsData.footer));
        setCmsPages(footerData.pages || []);
        setInvestments(footerData.investments || []);
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

  /* ------ Nav column helpers ------ */
  function updateColumnTitle(colIdx: number, title: string) {
    const updated = [...(footer.navColumns || [])];
    updated[colIdx] = { ...updated[colIdx], title };
    updateField("navColumns", updated);
  }

  function deleteColumn(colIdx: number) {
    updateField(
      "navColumns",
      (footer.navColumns || []).filter((_: FooterNavColumn, i: number) => i !== colIdx)
    );
  }

  function updateLink(colIdx: number, linkIdx: number, field: "label" | "url", value: string) {
    const updated = [...(footer.navColumns || [])];
    const links = [...updated[colIdx].links];
    links[linkIdx] = { ...links[linkIdx], [field]: value };
    updated[colIdx] = { ...updated[colIdx], links };
    updateField("navColumns", updated);
  }

  function deleteLink(colIdx: number, linkIdx: number) {
    const updated = [...(footer.navColumns || [])];
    updated[colIdx] = {
      ...updated[colIdx],
      links: updated[colIdx].links.filter((_: FooterLink, i: number) => i !== linkIdx),
    };
    updateField("navColumns", updated);
  }

  function addPageLink(colIdx: number, page: CmsPage) {
    const updated = [...(footer.navColumns || [])];
    const url = page.isHomepage ? "/" : `/${page.slug}`;
    updated[colIdx] = {
      ...updated[colIdx],
      links: [
        ...updated[colIdx].links,
        { label: page.title, url, source: "page" as const, pageId: page.id },
      ],
    };
    updateField("navColumns", updated);
  }

  function addCustomLink(colIdx: number) {
    const updated = [...(footer.navColumns || [])];
    updated[colIdx] = {
      ...updated[colIdx],
      links: [...updated[colIdx].links, { label: "", url: "", source: "custom" as const }],
    };
    updateField("navColumns", updated);
  }

  function handleLinkDragEnd(colIdx: number, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const col = (footer.navColumns || [])[colIdx];
    const ids = col.links.map((_: FooterLink, i: number) => `${colIdx}-${i}`);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...(footer.navColumns || [])];
    updated[colIdx] = {
      ...updated[colIdx],
      links: arrayMove([...updated[colIdx].links], oldIndex, newIndex),
    };
    updateField("navColumns", updated);
  }

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const cols = footer.navColumns || [];
    const columnIds = cols.map((_: FooterNavColumn, i: number) => `col-${i}`);
    const oldIndex = columnIds.indexOf(active.id as string);
    const newIndex = columnIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    updateField("navColumns", arrayMove([...cols], oldIndex, newIndex));
  }

  /* ------ Investment link helpers ------ */
  function getInvestmentLink(investmentId: string): { url: string; visible: boolean } {
    const found = (footer.investmentLinks || []).find(
      (il: FooterInvestmentLink) => il.investmentId === investmentId
    );
    return { url: found?.url || "", visible: found?.visible ?? true };
  }

  function updateInvestmentLink(
    investmentId: string,
    investmentName: string,
    field: "url" | "visible",
    value: string | boolean
  ) {
    const existing = footer.investmentLinks || [];
    const idx = existing.findIndex(
      (il: FooterInvestmentLink) => il.investmentId === investmentId
    );
    let updated: FooterInvestmentLink[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = { ...updated[idx], [field]: value };
    } else {
      updated = [
        ...existing,
        { investmentId, investmentName, url: "", visible: true, [field]: value },
      ];
    }
    updateField("investmentLinks", updated);
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
                <Label htmlFor="footer-newsletter-heading">Newsletter Heading</Label>
                <Input
                  id="footer-newsletter-heading"
                  value={footer.newsletterHeading}
                  onChange={(e) => updateField("newsletterHeading", e.target.value)}
                  placeholder="Stay Updated"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="footer-newsletter-desc">Newsletter Description</Label>
                <Input
                  id="footer-newsletter-desc"
                  value={footer.newsletterDescription}
                  onChange={(e) => updateField("newsletterDescription", e.target.value)}
                  placeholder="Optional description text"
                />
              </div>
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
                    updateField(
                      "links",
                      footer.links.filter((_: FooterLink, j: number) => j !== i)
                    );
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

        {/* Navigation Columns — WordPress-style menu builder */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Columns className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Navigation Columns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Build footer navigation columns. Add links from your published CMS pages or create custom links. Drag to reorder.
            </p>
            <DndContext
              id={`${dndId}-columns`}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleColumnDragEnd}
            >
              <SortableContext
                items={(footer.navColumns || []).map((_: FooterNavColumn, i: number) => `col-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {(footer.navColumns || []).map((col: FooterNavColumn, colIdx: number) => {
                  const linkIds = col.links.map((_: FooterLink, i: number) => `${colIdx}-${i}`);

                  return (
                    <SortableNavColumn key={colIdx} columnId={`col-${colIdx}`}>
                      {({ attributes, listeners }) => (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              {...attributes}
                              {...listeners}
                              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
                              title="Drag to reorder column"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <Input
                              value={col.title}
                              onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
                              placeholder="Column title (e.g. Firm)"
                              className="flex-1 font-medium"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteColumn(colIdx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Sortable links */}
                          <DndContext
                            id={`${dndId}-col-${colIdx}`}
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => handleLinkDragEnd(colIdx, event)}
                          >
                            <SortableContext items={linkIds} strategy={verticalListSortingStrategy}>
                              {col.links.map((link: FooterLink, linkIdx: number) => (
                                <SortableLinkRow
                                  key={linkIds[linkIdx]}
                                  link={link}
                                  linkId={linkIds[linkIdx]}
                                  onChangeLabel={(v) => updateLink(colIdx, linkIdx, "label", v)}
                                  onChangeUrl={(v) => updateLink(colIdx, linkIdx, "url", v)}
                                  onDelete={() => deleteLink(colIdx, linkIdx)}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>

                          <div className="flex items-center gap-2 pl-2">
                            <PagePickerPopover
                              pages={cmsPages}
                              onSelect={(page) => addPageLink(colIdx, page)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addCustomLink(colIdx)}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Add Custom Link
                            </Button>
                          </div>
                        </>
                      )}
                    </SortableNavColumn>
                  );
                })}
              </SortableContext>
            </DndContext>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                updateField("navColumns", [
                  ...(footer.navColumns || []),
                  { title: "", links: [] },
                ]);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Column
            </Button>
          </CardContent>
        </Card>

        {/* Investment Links */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Investment Links</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Assign URLs to each investment. These are used in the Investments column of the footer. Leave blank to render as plain text.
            </p>
            {investments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No investments found. Create investments first.
              </p>
            )}
            {investments.map((inv) => {
              const il = getInvestmentLink(inv.id);
              return (
                <div key={inv.id} className="flex items-center gap-3">
                  <Switch
                    checked={il.visible}
                    onCheckedChange={(checked) =>
                      updateInvestmentLink(inv.id, inv.name, "visible", checked)
                    }
                  />
                  <span className="text-sm font-medium w-48 shrink-0 truncate">{inv.name}</span>
                  <Input
                    value={il.url}
                    onChange={(e) =>
                      updateInvestmentLink(inv.id, inv.name, "url", e.target.value)
                    }
                    placeholder="URL (e.g. /investments/fund-name)"
                    className="flex-1"
                  />
                </div>
              );
            })}
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

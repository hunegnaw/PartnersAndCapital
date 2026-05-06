"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BLOCK_TYPES,
  NESTABLE_BLOCK_TYPES,
  type BlockType,
  type SubBlockData,
} from "@/lib/page-blocks";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPicker } from "./media-picker";
import { BlockTypePicker } from "./block-type-picker";
import { ColorField } from "./color-field";
import { ImageIcon, Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";

// Helper field components — declared outside BlockEditorForm to satisfy react-hooks/static-components

function InputField({
  label,
  field,
  type: inputType = "text",
  placeholder,
  props,
  updateProp,
}: {
  label: string;
  field: string;
  type?: string;
  placeholder?: string;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={inputType}
        value={(props[field] as string) || ""}
        onChange={(e) => updateProp(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
      />
    </div>
  );
}

function SelectField({
  label,
  field,
  options,
  props,
  updateProp,
}: {
  label: string;
  field: string;
  options: { value: string; label: string }[];
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={(props[field] as string) || ""}
        onChange={(e) => updateProp(field, e.target.value)}
        className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ImageField({
  label,
  field,
  accept = "image" as "image" | "video" | "all",
  props,
  updateProp,
  onOpenMedia,
}: {
  label: string;
  field: string;
  accept?: "image" | "video" | "all";
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
  onOpenMedia: (field: string, accept: "image" | "video" | "all") => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={(props[field] as string) || ""}
          onChange={(e) => updateProp(field, e.target.value)}
          placeholder="URL or select from media"
          className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
        />
        <button
          type="button"
          onClick={() => onOpenMedia(field, accept)}
          className="p-1.5 border rounded-md hover:bg-gray-50"
        >
          <ImageIcon size={16} />
        </button>
      </div>
      {(props[field] as string) && (
        <div className="mt-2 relative w-24 h-16 rounded overflow-hidden bg-gray-100">
          {accept === "video" ? (
            <video
              src={props[field] as string}
              className="w-full h-full object-cover"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={props[field] as string}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}

function RichTextField({
  label,
  field,
  props,
  updateProp,
}: {
  label: string;
  field: string;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <RichTextEditor
        content={(props[field] as string) || ""}
        onChange={(html) => updateProp(field, html)}
      />
    </div>
  );
}

function RangeField({
  label,
  field,
  min = 0,
  max = 1,
  step = 0.1,
  props,
  updateProp,
}: {
  label: string;
  field: string;
  min?: number;
  max?: number;
  step?: number;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}: {props[field] as number}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={(props[field] as number) || 0}
        onChange={(e) => updateProp(field, parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

function CheckboxField({
  label,
  field,
  props,
  updateProp,
}: {
  label: string;
  field: string;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={!!props[field]}
        onChange={(e) => updateProp(field, e.target.checked)}
        className="rounded border-gray-300"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

// --- Column sub-block editor (used inside Two Column) ---

function ColumnBlockEditor({
  label,
  blocks,
  onChange,
}: {
  label: string;
  blocks: SubBlockData[];
  onChange: (blocks: SubBlockData[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addBlock = (type: BlockType) => {
    const config = BLOCK_TYPES[type];
    const newBlock: SubBlockData = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      props: { ...config.defaultProps },
      sortOrder: blocks.length,
    };
    onChange([...blocks, newBlock]);
    setExpandedId(newBlock.id);
  };

  const updateBlock = (id: string, newProps: Record<string, unknown>) => {
    onChange(
      blocks.map((b) => (b.id === id ? { ...b, props: newProps } : b))
    );
  };

  const removeBlock = (id: string) => {
    onChange(
      blocks
        .filter((b) => b.id !== id)
        .map((b, i) => ({ ...b, sortOrder: i }))
    );
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {blocks.map((block) => {
          const config = BLOCK_TYPES[block.type as BlockType];
          const isExpanded = expandedId === block.id;
          return (
            <div
              key={block.id}
              className="border rounded-lg bg-gray-50 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : block.id)}
                  className="flex items-center gap-1 flex-1 text-left text-sm font-medium"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {config?.label ?? block.type}
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3">
                  <BlockEditorForm
                    type={block.type as BlockType}
                    props={block.props}
                    onChange={(newProps) => updateBlock(block.id, newProps)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex items-center gap-1 mt-2 text-xs text-[#B07D3A] hover:underline"
      >
        <Plus size={12} /> Add Block
      </button>
      <BlockTypePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addBlock}
        allowedTypes={NESTABLE_BLOCK_TYPES}
      />
    </div>
  );
}

// --- Sortable logo item for drag-and-drop reordering ---

function SortableLogoItem({
  logo,
  index,
  onUpdate,
  onRemove,
  onOpenMedia,
}: {
  logo: { imageUrl: string; alt: string; url?: string };
  index: number;
  onUpdate: (index: number, updated: { imageUrl: string; alt: string; url?: string }) => void;
  onRemove: (index: number) => void;
  onOpenMedia: (index: number) => void;
}) {
  const id = `logo-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 mb-2 p-2 border rounded">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 mt-1 shrink-0"
      >
        <GripVertical size={14} />
      </button>
      {logo.imageUrl && (
        <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo.imageUrl} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={logo.imageUrl}
            onChange={(e) => onUpdate(index, { ...logo, imageUrl: e.target.value })}
            placeholder="Image URL"
            className="flex-1 px-2 py-1 text-xs border rounded"
          />
          <button
            type="button"
            onClick={() => onOpenMedia(index)}
            className="p-1 border rounded hover:bg-gray-50 shrink-0"
          >
            <ImageIcon size={14} />
          </button>
        </div>
        <input
          type="text"
          value={logo.alt}
          onChange={(e) => onUpdate(index, { ...logo, alt: e.target.value })}
          placeholder="Alt text"
          className="w-full px-2 py-1 text-xs border rounded"
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1 text-red-500 hover:bg-red-50 rounded mt-1 shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// --- Logo gallery editor (extracted to avoid conditional hook calls) ---

function LogoGalleryEditor({
  props,
  updateProp,
}: {
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}) {
  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    field: string;
    accept: "image" | "video" | "all";
  }>({ open: false, field: "", accept: "all" });

  const logos = (props.logos as { imageUrl: string; alt: string; url?: string }[]) || [];
  const logoIds = logos.map((_, i) => `logo-${i}`);
  const fp = { props, updateProp };

  const logoSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleLogoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt((active.id as string).split("-")[1]);
    const newIndex = parseInt((over.id as string).split("-")[1]);
    updateProp("logos", arrayMove(logos, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <InputField label="Heading" field="heading" {...fp} />
      <SelectField
        label="Columns"
        field="columns"
        options={[
          { value: "2", label: "2 Columns" },
          { value: "3", label: "3 Columns" },
          { value: "4", label: "4 Columns" },
          { value: "5", label: "5 Columns" },
          { value: "6", label: "6 Columns" },
        ]}
        {...fp}
      />
      <CheckboxField label="Grayscale" field="grayscale" {...fp} />
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Logos
        </label>
        <DndContext
          sensors={logoSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleLogoDragEnd}
        >
          <SortableContext items={logoIds} strategy={verticalListSortingStrategy}>
            {logos.map((logo, i) => (
              <SortableLogoItem
                key={`logo-${i}`}
                logo={logo}
                index={i}
                onUpdate={(idx, updated) => {
                  const newLogos = [...logos];
                  newLogos[idx] = updated;
                  updateProp("logos", newLogos);
                }}
                onRemove={(idx) => {
                  updateProp("logos", logos.filter((_, j) => j !== idx));
                }}
                onOpenMedia={(idx) => {
                  setMediaPicker({ open: true, field: `logo_${idx}`, accept: "image" });
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={() =>
            updateProp("logos", [...logos, { imageUrl: "", alt: "" }])
          }
          className="flex items-center gap-1 text-xs text-[#B07D3A] hover:underline"
        >
          <Plus size={12} /> Add Logo
        </button>
      </div>
      <MediaPicker
        open={mediaPicker.open}
        onClose={() => setMediaPicker({ ...mediaPicker, open: false })}
        onSelect={(m) => {
          if (mediaPicker.field.startsWith("logo_")) {
            const idx = parseInt(mediaPicker.field.split("_")[1]);
            const updated = [...logos];
            updated[idx] = { ...updated[idx], imageUrl: m.filePath };
            updateProp("logos", updated);
          } else {
            updateProp(mediaPicker.field, m.filePath);
          }
        }}
        accept={mediaPicker.accept}
      />
    </div>
  );
}

// --- Main component ---

interface BlockEditorFormProps {
  type: BlockType;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}

export function BlockEditorForm({ type, props, onChange }: BlockEditorFormProps) {
  const [mediaPicker, setMediaPicker] = useState<{
    open: boolean;
    field: string;
    accept: "image" | "video" | "all";
  }>({ open: false, field: "", accept: "all" });

  const updateProp = (key: string, value: unknown) => {
    onChange({ ...props, [key]: value });
  };

  const openMedia = (field: string, accept: "image" | "video" | "all") => {
    setMediaPicker({ open: true, field, accept });
  };

  // Shorthand props for all field components
  const fp = { props, updateProp };
  const ifp = { ...fp, onOpenMedia: openMedia };

  // Render form fields based on block type
  switch (type) {
    case "hero_video":
      return (
        <div className="space-y-4">
          <ImageField label="Video URL" field="videoUrl" accept="video" {...ifp} />
          <ImageField label="Poster Image" field="posterImageUrl" {...ifp} />
          <InputField label="Tagline" field="tagline" placeholder="e.g. Private Markets · Alternative Investments" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Heading</label>
            <textarea
              value={(props.heading as string) || ""}
              onChange={(e) => updateProp("heading", e.target.value)}
              placeholder="Enter heading text (each line renders separately)"
              rows={4}
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50 resize-y"
            />
            <p className="mt-1 text-xs text-gray-400">Each line renders on its own row. Wrap text in **double asterisks** for italic gold text.</p>
          </div>
          <InputField label="Subtitle" field="subheading" {...fp} />
          <InputField label="Primary CTA Text" field="ctaText" {...fp} />
          <InputField label="Primary CTA URL" field="ctaUrl" {...fp} />
          <InputField label="Secondary CTA Text" field="ctaText2" {...fp} />
          <InputField label="Secondary CTA URL" field="ctaUrl2" {...fp} />
          <CheckboxField label="Show Dynamic Stats" field="showStats" {...fp} />
          <InputField label="Scroll Hint Text" field="scrollHintText" {...fp} />
          <RangeField label="Overlay Opacity" field="overlayOpacity" {...fp} />
          <MediaPicker
            open={mediaPicker.open}
            onClose={() => setMediaPicker({ ...mediaPicker, open: false })}
            onSelect={(m) => updateProp(mediaPicker.field, m.filePath)}
            accept={mediaPicker.accept}
          />
        </div>
      );

    case "hero_image":
      return (
        <div className="space-y-4">
          <ImageField label="Background Image" field="imageUrl" {...ifp} />
          <InputField label="Heading" field="heading" {...fp} />
          <InputField label="Subheading" field="subheading" {...fp} />
          <InputField label="CTA Text" field="ctaText" {...fp} />
          <InputField label="CTA URL" field="ctaUrl" {...fp} />
          <RangeField label="Overlay Opacity" field="overlayOpacity" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <ColorField label="Text Color" field="textColor" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Height
            </label>
            <div className="flex items-center gap-2">
              <select
                value={["50vh", "70vh", "85vh", "100vh"].includes(props.height as string) ? (props.height as string) : "custom"}
                onChange={(e) => {
                  if (e.target.value !== "custom") updateProp("height", e.target.value);
                }}
                className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
              >
                <option value="50vh">Small (50vh)</option>
                <option value="70vh">Medium (70vh)</option>
                <option value="85vh">Large (85vh)</option>
                <option value="100vh">Full Screen (100vh)</option>
                <option value="custom">Custom</option>
              </select>
              <input
                type="text"
                value={(props.height as string) || "70vh"}
                onChange={(e) => updateProp("height", e.target.value)}
                placeholder="e.g. 400px, 60vh, 30rem"
                className="flex-1 px-3 py-1.5 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
              />
            </div>
          </div>
          <MediaPicker
            open={mediaPicker.open}
            onClose={() => setMediaPicker({ ...mediaPicker, open: false })}
            onSelect={(m) => updateProp(mediaPicker.field, m.filePath)}
            accept={mediaPicker.accept}
          />
        </div>
      );

    case "text_section":
      return (
        <div className="space-y-4">
          <RichTextField label="Content" field="content" {...fp} />
          <SelectField
            label="Max Width"
            field="maxWidth"
            options={[
              { value: "2xl", label: "Small (2xl)" },
              { value: "4xl", label: "Medium (4xl)" },
              { value: "6xl", label: "Large (6xl)" },
              { value: "full", label: "Full Width" },
            ]}
            {...fp}
          />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <ColorField label="Text Color" field="textColor" {...fp} />
          <SelectField
            label="Vertical Padding"
            field="paddingY"
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra Large" },
            ]}
            {...fp}
          />
        </div>
      );

    case "logo_gallery":
      return <LogoGalleryEditor props={props} updateProp={updateProp} />;

    case "stats": {
      const stats = (props.stats as { value: string; label: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Stats
            </label>
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => {
                    const updated = [...stats];
                    updated[i] = { ...updated[i], value: e.target.value };
                    updateProp("stats", updated);
                  }}
                  placeholder="Value"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => {
                    const updated = [...stats];
                    updated[i] = { ...updated[i], label: e.target.value };
                    updateProp("stats", updated);
                  }}
                  placeholder="Label"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    updateProp("stats", stats.filter((_, j) => j !== i));
                  }}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateProp("stats", [...stats, { value: "", label: "" }])
              }
              className="flex items-center gap-1 text-xs text-[#B07D3A] hover:underline"
            >
              <Plus size={12} /> Add Stat
            </button>
          </div>
        </div>
      );
    }

    case "cta_banner":
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" {...fp} />
          <InputField label="Text" field="text" {...fp} />
          <InputField label="CTA Text" field="ctaText" {...fp} />
          <InputField label="CTA URL" field="ctaUrl" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
        </div>
      );

    case "two_column": {
      const leftBlocks = (props.leftBlocks as SubBlockData[]) || [];
      const rightBlocks = (props.rightBlocks as SubBlockData[]) || [];
      return (
        <div className="space-y-4">
          <SelectField
            label="Left Column Width"
            field="leftWidth"
            options={[
              { value: "1/3", label: "1/3" },
              { value: "1/2", label: "1/2" },
              { value: "2/3", label: "2/3" },
            ]}
            {...fp}
          />
          <ColumnBlockEditor
            label="Left Column Blocks"
            blocks={leftBlocks}
            onChange={(blocks) => updateProp("leftBlocks", blocks)}
          />
          <ColumnBlockEditor
            label="Right Column Blocks"
            blocks={rightBlocks}
            onChange={(blocks) => updateProp("rightBlocks", blocks)}
          />
        </div>
      );
    }

    case "contact_form":
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" {...fp} />
          <InputField label="Description" field="description" {...fp} />
          <CheckboxField label="Show Address" field="showAddress" {...fp} />
          <CheckboxField label="Show Email" field="showEmail" {...fp} />
        </div>
      );

    case "newsletter_signup":
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" {...fp} />
          <InputField label="Description" field="description" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <ColorField label="Text Color" field="textColor" {...fp} />
          <ColorField label="Button Color" field="buttonColor" {...fp} />
          <ColorField label="Button Text Color" field="buttonTextColor" {...fp} />
        </div>
      );

    case "quote":
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quote Text
            </label>
            <textarea
              value={(props.text as string) || ""}
              onChange={(e) => updateProp("text", e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
            />
          </div>
          <InputField label="Attribution" field="attribution" {...fp} />
          <InputField label="Role / Title" field="role" {...fp} />
        </div>
      );

    case "image":
      return (
        <div className="space-y-4">
          <ImageField label="Image URL" field="imageUrl" {...ifp} />
          <InputField label="Alt Text" field="alt" {...fp} />
          <InputField label="Caption" field="caption" {...fp} />
          <SelectField
            label="Max Width"
            field="maxWidth"
            options={[
              { value: "2xl", label: "Small (2xl)" },
              { value: "4xl", label: "Medium (4xl)" },
              { value: "6xl", label: "Large (6xl)" },
              { value: "full", label: "Full Width" },
            ]}
            {...fp}
          />
          <MediaPicker
            open={mediaPicker.open}
            onClose={() => setMediaPicker({ ...mediaPicker, open: false })}
            onSelect={(m) => updateProp(mediaPicker.field, m.filePath)}
            accept={mediaPicker.accept}
          />
        </div>
      );

    case "embed":
      return (
        <div className="space-y-4">
          <InputField label="Video URL" field="url" placeholder="YouTube or Vimeo URL" {...fp} />
          <InputField label="Title" field="title" {...fp} />
          <SelectField
            label="Aspect Ratio"
            field="aspectRatio"
            options={[
              { value: "16/9", label: "16:9" },
              { value: "4/3", label: "4:3" },
              { value: "1/1", label: "1:1" },
            ]}
            {...fp}
          />
        </div>
      );

    case "spacer":
      return (
        <div className="space-y-4">
          <SelectField
            label="Height"
            field="height"
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra Large" },
            ]}
            {...fp}
          />
        </div>
      );

    case "asset_cards": {
      const cards = (props.cards as { name: string; description: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Tagline" field="tagline" {...fp} />
          <div>
            <InputField label="Heading" field="heading" {...fp} />
            <p className="mt-1 text-xs text-gray-400">Wrap text in **double asterisks** for italic gold text</p>
          </div>
          <InputField label="Subtitle" field="subtitle" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Cards
            </label>
            {cards.map((card, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 p-2 border rounded">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={card.name}
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[i] = { ...updated[i], name: e.target.value };
                      updateProp("cards", updated);
                    }}
                    placeholder="Card name"
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                  <textarea
                    value={card.description}
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[i] = { ...updated[i], description: e.target.value };
                      updateProp("cards", updated);
                    }}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateProp("cards", cards.filter((_, j) => j !== i))}
                  className="p-1 text-red-500 hover:bg-red-50 rounded mt-1 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateProp("cards", [...cards, { name: "", description: "" }])}
              className="flex items-center gap-1 text-xs text-[#B07D3A] hover:underline"
            >
              <Plus size={12} /> Add Card
            </button>
          </div>
        </div>
      );
    }

    case "philosophy": {
      const pillars = (props.pillars as { name: string; description: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Tagline" field="tagline" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quote</label>
            <textarea
              value={(props.quote as string) || ""}
              onChange={(e) => updateProp("quote", e.target.value)}
              rows={4}
              placeholder="Wrap text in **double asterisks** for italic gold text"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
            />
          </div>
          <InputField label="Attribution" field="attribution" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <ColorField label="Text Color" field="textColor" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Pillars
            </label>
            {pillars.map((pillar, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 p-2 border rounded">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={pillar.name}
                    onChange={(e) => {
                      const updated = [...pillars];
                      updated[i] = { ...updated[i], name: e.target.value };
                      updateProp("pillars", updated);
                    }}
                    placeholder="Pillar name"
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                  <textarea
                    value={pillar.description}
                    onChange={(e) => {
                      const updated = [...pillars];
                      updated[i] = { ...updated[i], description: e.target.value };
                      updateProp("pillars", updated);
                    }}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateProp("pillars", pillars.filter((_, j) => j !== i))}
                  className="p-1 text-red-500 hover:bg-red-50 rounded mt-1 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateProp("pillars", [...pillars, { name: "", description: "" }])}
              className="flex items-center gap-1 text-xs text-[#B07D3A] hover:underline"
            >
              <Plus size={12} /> Add Pillar
            </button>
          </div>
        </div>
      );
    }

    case "process_steps": {
      const steps = (props.steps as { name: string; description: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Tagline" field="tagline" {...fp} />
          <div>
            <InputField label="Heading" field="heading" {...fp} />
            <p className="mt-1 text-xs text-gray-400">Wrap text in **double asterisks** for italic gold text</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Steps
            </label>
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 p-2 border rounded">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => {
                      const updated = [...steps];
                      updated[i] = { ...updated[i], name: e.target.value };
                      updateProp("steps", updated);
                    }}
                    placeholder="Step name"
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                  <textarea
                    value={step.description}
                    onChange={(e) => {
                      const updated = [...steps];
                      updated[i] = { ...updated[i], description: e.target.value };
                      updateProp("steps", updated);
                    }}
                    placeholder="Description"
                    rows={2}
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateProp("steps", steps.filter((_, j) => j !== i))}
                  className="p-1 text-red-500 hover:bg-red-50 rounded mt-1 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateProp("steps", [...steps, { name: "", description: "" }])}
              className="flex items-center gap-1 text-xs text-[#B07D3A] hover:underline"
            >
              <Plus size={12} /> Add Step
            </button>
          </div>
          <div className="border-t pt-4 mt-4">
            <p className="text-xs font-medium text-gray-700 mb-3">Sidebar Card</p>
            <div className="space-y-3">
              <InputField label="Sidebar Tagline" field="sidebarTagline" {...fp} />
              <InputField label="Sidebar Stat" field="sidebarStat" placeholder="e.g. 28%" {...fp} />
              <InputField label="Sidebar Label" field="sidebarLabel" {...fp} />
              <InputField label="Sidebar Quote" field="sidebarQuote" {...fp} />
              <CheckboxField label="Use Dynamic Stats (avg net return)" field="showDynamicStats" {...fp} />
            </div>
          </div>
        </div>
      );
    }

    case "cta_split": {
      const bullets = (props.bullets as { text: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Tagline" field="tagline" {...fp} />
          <div>
            <InputField label="Heading" field="heading" {...fp} />
            <p className="mt-1 text-xs text-gray-400">Wrap text in **double asterisks** for italic gold text</p>
          </div>
          <InputField label="Description" field="description" {...fp} />
          <InputField label="Primary CTA Text" field="ctaText" {...fp} />
          <InputField label="Primary CTA URL" field="ctaUrl" {...fp} />
          <InputField label="Secondary CTA Text" field="ctaText2" {...fp} />
          <InputField label="Secondary CTA URL" field="ctaUrl2" {...fp} />
          <ColorField label="Background Color" field="backgroundColor" {...fp} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Bullet Points
            </label>
            {bullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={bullet.text}
                  onChange={(e) => {
                    const updated = [...bullets];
                    updated[i] = { text: e.target.value };
                    updateProp("bullets", updated);
                  }}
                  placeholder="Bullet text (use **bold** for emphasis)"
                  className="flex-1 px-2 py-1 text-xs border rounded"
                />
                <button
                  type="button"
                  onClick={() => updateProp("bullets", bullets.filter((_, j) => j !== i))}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateProp("bullets", [...bullets, { text: "" }])}
              className="flex items-center gap-1 text-xs text-[#B07D3A] hover:underline"
            >
              <Plus size={12} /> Add Bullet
            </button>
          </div>
        </div>
      );
    }

    default:
      return <p className="text-sm text-gray-500">No editor for this block type.</p>;
  }
}

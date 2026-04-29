"use client";

import { useState } from "react";
import type { BlockType } from "@/lib/page-blocks";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPicker } from "./media-picker";
import { ImageIcon, Plus, Trash2 } from "lucide-react";

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
          <InputField label="Heading" field="heading" {...fp} />
          <InputField label="Subheading" field="subheading" {...fp} />
          <InputField label="CTA Text" field="ctaText" {...fp} />
          <InputField label="CTA URL" field="ctaUrl" {...fp} />
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
          <InputField label="Background Color" field="backgroundColor" {...fp} />
          <InputField label="Text Color" field="textColor" {...fp} />
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

    case "logo_gallery": {
      const logos = (props.logos as { imageUrl: string; alt: string; url?: string }[]) || [];
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
            {logos.map((logo, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 p-2 border rounded">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={logo.imageUrl}
                    onChange={(e) => {
                      const updated = [...logos];
                      updated[i] = { ...updated[i], imageUrl: e.target.value };
                      updateProp("logos", updated);
                    }}
                    placeholder="Image URL"
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                  <input
                    type="text"
                    value={logo.alt}
                    onChange={(e) => {
                      const updated = [...logos];
                      updated[i] = { ...updated[i], alt: e.target.value };
                      updateProp("logos", updated);
                    }}
                    placeholder="Alt text"
                    className="w-full px-2 py-1 text-xs border rounded"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = logos.filter((_, j) => j !== i);
                    updateProp("logos", updated);
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
            onSelect={(m) => updateProp(mediaPicker.field, m.filePath)}
            accept={mediaPicker.accept}
          />
        </div>
      );
    }

    case "stats": {
      const stats = (props.stats as { value: string; label: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" {...fp} />
          <InputField label="Background Color" field="backgroundColor" {...fp} />
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
          <InputField label="Background Color" field="backgroundColor" {...fp} />
        </div>
      );

    case "two_column":
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
          <RichTextField label="Left Content" field="leftContent" {...fp} />
          <RichTextField label="Right Content" field="rightContent" {...fp} />
        </div>
      );

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
          <InputField label="Background Color" field="backgroundColor" {...fp} />
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

    default:
      return <p className="text-sm text-gray-500">No editor for this block type.</p>;
  }
}

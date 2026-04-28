"use client";

import { useState } from "react";
import type { BlockType } from "@/lib/page-blocks";
import { RichTextEditor } from "./rich-text-editor";
import { MediaPicker } from "./media-picker";
import { ImageIcon, Plus, Trash2 } from "lucide-react";

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

  const InputField = ({
    label,
    field,
    type: inputType = "text",
    placeholder,
  }: {
    label: string;
    field: string;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={inputType}
        value={(props[field] as string) || ""}
        onChange={(e) => updateProp(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#b8860b]/50"
      />
    </div>
  );

  const SelectField = ({
    label,
    field,
    options,
  }: {
    label: string;
    field: string;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={(props[field] as string) || ""}
        onChange={(e) => updateProp(field, e.target.value)}
        className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#b8860b]/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const ImageField = ({
    label,
    field,
    accept = "image" as "image" | "video" | "all",
  }: {
    label: string;
    field: string;
    accept?: "image" | "video" | "all";
  }) => (
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
          className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#b8860b]/50"
        />
        <button
          type="button"
          onClick={() =>
            setMediaPicker({ open: true, field, accept })
          }
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

  const RichTextField = ({
    label,
    field,
  }: {
    label: string;
    field: string;
  }) => (
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

  const RangeField = ({
    label,
    field,
    min = 0,
    max = 1,
    step = 0.1,
  }: {
    label: string;
    field: string;
    min?: number;
    max?: number;
    step?: number;
  }) => (
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

  const CheckboxField = ({
    label,
    field,
  }: {
    label: string;
    field: string;
  }) => (
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

  // Render form fields based on block type
  switch (type) {
    case "hero_video":
      return (
        <div className="space-y-4">
          <ImageField label="Video URL" field="videoUrl" accept="video" />
          <ImageField label="Poster Image" field="posterImageUrl" />
          <InputField label="Heading" field="heading" />
          <InputField label="Subheading" field="subheading" />
          <InputField label="CTA Text" field="ctaText" />
          <InputField label="CTA URL" field="ctaUrl" />
          <RangeField label="Overlay Opacity" field="overlayOpacity" />
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
          <ImageField label="Background Image" field="imageUrl" />
          <InputField label="Heading" field="heading" />
          <InputField label="Subheading" field="subheading" />
          <InputField label="CTA Text" field="ctaText" />
          <InputField label="CTA URL" field="ctaUrl" />
          <RangeField label="Overlay Opacity" field="overlayOpacity" />
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
          <RichTextField label="Content" field="content" />
          <SelectField
            label="Max Width"
            field="maxWidth"
            options={[
              { value: "2xl", label: "Small (2xl)" },
              { value: "4xl", label: "Medium (4xl)" },
              { value: "6xl", label: "Large (6xl)" },
              { value: "full", label: "Full Width" },
            ]}
          />
          <InputField label="Background Color" field="backgroundColor" />
          <InputField label="Text Color" field="textColor" />
          <SelectField
            label="Vertical Padding"
            field="paddingY"
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra Large" },
            ]}
          />
        </div>
      );

    case "logo_gallery": {
      const logos = (props.logos as { imageUrl: string; alt: string; url?: string }[]) || [];
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" />
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
          />
          <CheckboxField label="Grayscale" field="grayscale" />
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
              className="flex items-center gap-1 text-xs text-[#b8860b] hover:underline"
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
          <InputField label="Heading" field="heading" />
          <InputField label="Background Color" field="backgroundColor" />
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
              className="flex items-center gap-1 text-xs text-[#b8860b] hover:underline"
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
          <InputField label="Heading" field="heading" />
          <InputField label="Text" field="text" />
          <InputField label="CTA Text" field="ctaText" />
          <InputField label="CTA URL" field="ctaUrl" />
          <InputField label="Background Color" field="backgroundColor" />
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
          />
          <RichTextField label="Left Content" field="leftContent" />
          <RichTextField label="Right Content" field="rightContent" />
        </div>
      );

    case "contact_form":
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" />
          <InputField label="Description" field="description" />
          <CheckboxField label="Show Address" field="showAddress" />
          <CheckboxField label="Show Email" field="showEmail" />
        </div>
      );

    case "newsletter_signup":
      return (
        <div className="space-y-4">
          <InputField label="Heading" field="heading" />
          <InputField label="Description" field="description" />
          <InputField label="Background Color" field="backgroundColor" />
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
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#b8860b]/50"
            />
          </div>
          <InputField label="Attribution" field="attribution" />
          <InputField label="Role / Title" field="role" />
        </div>
      );

    case "image":
      return (
        <div className="space-y-4">
          <ImageField label="Image URL" field="imageUrl" />
          <InputField label="Alt Text" field="alt" />
          <InputField label="Caption" field="caption" />
          <SelectField
            label="Max Width"
            field="maxWidth"
            options={[
              { value: "2xl", label: "Small (2xl)" },
              { value: "4xl", label: "Medium (4xl)" },
              { value: "6xl", label: "Large (6xl)" },
              { value: "full", label: "Full Width" },
            ]}
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
          <InputField label="Video URL" field="url" placeholder="YouTube or Vimeo URL" />
          <InputField label="Title" field="title" />
          <SelectField
            label="Aspect Ratio"
            field="aspectRatio"
            options={[
              { value: "16/9", label: "16:9" },
              { value: "4/3", label: "4:3" },
              { value: "1/1", label: "1:1" },
            ]}
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
          />
        </div>
      );

    default:
      return <p className="text-sm text-gray-500">No editor for this block type.</p>;
  }
}

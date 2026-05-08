"use client";

import { parseFontValue, buildFontValue } from "@/lib/block-fonts";

interface FontFieldProps {
  label: string;
  field: string;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
  hint?: string;
}

const FAMILY_OPTIONS = [
  { value: "", label: "Default" },
  { value: "heroTitle", label: "Hero Title" },
  { value: "sectionHeading", label: "Section Heading" },
  { value: "sectionTag", label: "Tag" },
  { value: "subtitle", label: "Subtitle" },
  { value: "body", label: "Body" },
];

const STYLE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "light", label: "Light" },
  { value: "light-italic", label: "Light Italic" },
  { value: "regular", label: "Regular" },
  { value: "italic", label: "Italic" },
  { value: "medium", label: "Medium" },
  { value: "medium-italic", label: "Medium Italic" },
  { value: "semibold", label: "Semi-Bold" },
  { value: "semibold-italic", label: "Semi-Bold Italic" },
  { value: "bold", label: "Bold" },
  { value: "bold-italic", label: "Bold Italic" },
];

export function FontField({ label, field, props, updateProp, hint }: FontFieldProps) {
  const raw = (props[field] as string) || "";
  const { family, style, size } = parseFontValue(raw);

  const setFamily = (f: string) => updateProp(field, buildFontValue(f, style, size));
  const setStyle = (s: string) => updateProp(field, buildFontValue(family, s, size));
  const setSize = (sz: string) => updateProp(field, buildFontValue(family, style, sz));

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
        >
          {FAMILY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
        >
          {STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Size"
          className="w-28 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
        />
      </div>
      {hint && (
        <p className="mt-1 text-[10px] text-gray-400">{hint}</p>
      )}
    </div>
  );
}

"use client";

interface FontFieldProps {
  label: string;
  field: string;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}

const FONT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "heroTitle", label: "Hero Title Font" },
  { value: "sectionHeading", label: "Section Heading Font" },
  { value: "sectionTag", label: "Tag Font" },
  { value: "subtitle", label: "Subtitle Font" },
  { value: "body", label: "Body Font" },
];

export function FontField({ label, field, props, updateProp }: FontFieldProps) {
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
        {FONT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

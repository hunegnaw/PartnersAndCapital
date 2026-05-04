"use client";

import { ColorPicker } from "./color-picker";

interface ColorFieldProps {
  label: string;
  field: string;
  props: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
}

export function ColorField({ label, field, props, updateProp }: ColorFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <ColorPicker
        value={(props[field] as string) || ""}
        onChange={(hex) => updateProp(field, hex)}
      />
    </div>
  );
}

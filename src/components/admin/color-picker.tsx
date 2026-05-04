"use client";

import { useRef, useState } from "react";
import { useSavedColors } from "@/components/providers/saved-colors-provider";
import { X } from "lucide-react";

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hexInput, setHexInput] = useState(value || "");
  const { colors: savedColors, addColor, removeColor } = useSavedColors();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const currentColor = HEX_REGEX.test(value) ? value : "#000000";

  function handleHexChange(raw: string) {
    let v = raw;
    if (v && !v.startsWith("#")) v = "#" + v;
    setHexInput(v);
    if (HEX_REGEX.test(v)) {
      onChange(v);
    }
  }

  function handleNativeChange(hex: string) {
    setHexInput(hex);
    onChange(hex);
  }

  function handleSwatchClick(hex: string) {
    setHexInput(hex);
    onChange(hex);
  }

  return (
    <div className="space-y-2">
      {/* Swatch + hex input row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-9 h-9 rounded-md border border-gray-300 shrink-0 cursor-pointer"
          style={{ backgroundColor: currentColor }}
        />
        <input
          ref={inputRef}
          type="color"
          value={currentColor}
          onChange={(e) => handleNativeChange(e.target.value)}
          className="sr-only"
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-1.5 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
        />
      </div>

      {/* Saved colors palette */}
      {(savedColors.length > 0 || value) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {savedColors.map((color) => (
            <div
              key={color}
              className="relative"
              onMouseEnter={() => setHoveredColor(color)}
              onMouseLeave={() => setHoveredColor(null)}
            >
              <button
                type="button"
                onClick={() => handleSwatchClick(color)}
                className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title={color}
              />
              {hoveredColor === color && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColor(color);
                    setHoveredColor(null);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={8} />
                </button>
              )}
            </div>
          ))}
          {value && HEX_REGEX.test(value) && !savedColors.includes(value.toLowerCase()) && (
            <button
              type="button"
              onClick={() => addColor(value)}
              className="text-[11px] text-[#B07D3A] hover:underline ml-1"
            >
              Save color
            </button>
          )}
        </div>
      )}
    </div>
  );
}

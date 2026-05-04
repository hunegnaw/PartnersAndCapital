"use client";

import { useRef, useState } from "react";
import { useSavedColors } from "@/components/providers/saved-colors-provider";
import { X } from "lucide-react";

const HEX6_REGEX = /^#[0-9a-fA-F]{6}$/;
const HEX8_REGEX = /^#[0-9a-fA-F]{8}$/;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

/** Convert opacity 0-100 to 2-digit hex */
function opacityToHex(opacity: number): string {
  const clamped = Math.max(0, Math.min(100, opacity));
  const byte = Math.round((clamped / 100) * 255);
  return byte.toString(16).padStart(2, "0");
}

/** Extract opacity from a color value (0-100) */
function extractOpacity(color: string): number {
  if (!color || color === "transparent") return 0;
  if (HEX8_REGEX.test(color)) {
    const alpha = parseInt(color.slice(7, 9), 16);
    return Math.round((alpha / 255) * 100);
  }
  return 100;
}

/** Extract the 6-digit hex from a color value */
function extractHex6(color: string): string {
  if (!color || color === "transparent") return "#000000";
  if (HEX8_REGEX.test(color)) return color.slice(0, 7);
  if (HEX6_REGEX.test(color)) return color;
  return "#000000";
}

/** Build final color value from hex6 + opacity */
function buildColor(hex6: string, opacity: number): string {
  if (opacity === 0) return "transparent";
  if (opacity === 100) return hex6;
  return hex6 + opacityToHex(opacity);
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { colors: savedColors, addColor, removeColor } = useSavedColors();
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  const isTransparent = value === "transparent";
  const hex6 = extractHex6(value);
  const opacity = extractOpacity(value);

  // Track hexInput locally for intermediate typing; reset when value prop changes
  const [hexInput, setHexInput] = useState(hex6);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setHexInput(extractHex6(value));
  }

  function handleHexChange(raw: string) {
    let v = raw;
    if (v && !v.startsWith("#")) v = "#" + v;
    setHexInput(v);
    if (HEX6_REGEX.test(v)) {
      onChange(buildColor(v, opacity));
    }
  }

  function handleNativeChange(hex: string) {
    setHexInput(hex);
    onChange(buildColor(hex, opacity));
  }

  function handleOpacityChange(newOpacity: number) {
    onChange(buildColor(hex6, newOpacity));
  }

  function handleSwatchClick(color: string) {
    setHexInput(extractHex6(color));
    onChange(color);
  }

  function handleTransparentClick() {
    onChange("transparent");
  }

  const currentColor = HEX6_REGEX.test(hex6) ? hex6 : "#000000";

  return (
    <div className="space-y-2">
      {/* Swatch + hex input + transparent button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-9 h-9 rounded-md border border-gray-300 shrink-0 cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: isTransparent ? "transparent" : currentColor }}
        >
          {/* Checkerboard pattern for transparent indication */}
          {isTransparent && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                backgroundSize: "8px 8px",
                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
              }}
            />
          )}
        </button>
        <input
          ref={inputRef}
          type="color"
          value={currentColor}
          onChange={(e) => handleNativeChange(e.target.value)}
          className="sr-only"
        />
        <input
          type="text"
          value={isTransparent ? "transparent" : hexInput}
          onChange={(e) => {
            if (e.target.value === "transparent") {
              handleTransparentClick();
            } else {
              handleHexChange(e.target.value);
            }
          }}
          placeholder="#000000"
          className="flex-1 px-3 py-1.5 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
        />
        <button
          type="button"
          onClick={handleTransparentClick}
          className={`px-2 py-1.5 text-xs border rounded-md shrink-0 transition-colors ${
            isTransparent
              ? "bg-gray-900 text-white border-gray-900"
              : "text-gray-600 hover:bg-gray-50 border-gray-300"
          }`}
        >
          None
        </button>
      </div>

      {/* Opacity slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-14 shrink-0">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={opacity}
          onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
          className="flex-1 h-1.5 accent-[#B07D3A]"
        />
        <span className="text-xs font-mono text-gray-600 w-8 text-right">{opacity}%</span>
      </div>

      {/* Saved colors palette */}
      {(savedColors.length > 0 || (value && value !== "transparent")) && (
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
                style={{ backgroundColor: color === "transparent" ? "#ffffff" : extractHex6(color) }}
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
          {value && value !== "transparent" && HEX6_REGEX.test(extractHex6(value)) && !savedColors.includes(value.toLowerCase()) && (
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

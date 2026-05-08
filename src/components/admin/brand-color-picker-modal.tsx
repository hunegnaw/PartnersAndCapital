"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { BRAND_PALETTE, findBrandColor } from "@/lib/brand-palette";
import { Search } from "lucide-react";

interface BrandColorPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (hex: string) => void;
  currentColor?: string;
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export function BrandColorPickerModal({
  open,
  onClose,
  onSelect,
  currentColor,
}: BrandColorPickerModalProps) {
  const [search, setSearch] = useState("");
  const [customColor, setCustomColor] = useState("#000000");
  const nativeRef = useRef<HTMLInputElement>(null);

  const normalizedCurrent = currentColor?.toLowerCase() || "";
  const query = search.toLowerCase();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Brand Palette</DialogTitle>
          <DialogDescription>
            Select a color from the brand guide or enter a custom value.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or hex..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
          />
        </div>

        {/* Palette grid */}
        <TooltipProvider delay={200}>
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 -mr-1">
            {BRAND_PALETTE.map((category) => {
              const filtered = category.colors.filter(
                (c) =>
                  !query ||
                  c.name.toLowerCase().includes(query) ||
                  c.hex.toLowerCase().includes(query)
              );
              if (filtered.length === 0) return null;

              return (
                <div key={category.id}>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {category.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filtered.map((color) => {
                      const isSelected =
                        color.hex.toLowerCase() === normalizedCurrent;
                      const light = isLightColor(color.hex);

                      return (
                        <Tooltip key={`${category.id}-${color.hex}`}>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                onClick={() => {
                                  onSelect(color.hex.toLowerCase());
                                  onClose();
                                }}
                                className={`w-14 h-14 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-end pb-1 ${
                                  isSelected
                                    ? "ring-2 ring-[#B07D3A] ring-offset-2 border-[#B07D3A]"
                                    : light
                                      ? "border-gray-300"
                                      : "border-transparent"
                                }`}
                                style={{ backgroundColor: color.hex }}
                              >
                                <span
                                  className="text-[8px] font-mono leading-none"
                                  style={{ color: light ? "#1A2640" : "#ffffff" }}
                                >
                                  {color.hex}
                                </span>
                              </button>
                            }
                          />
                          <TooltipContent side="top">
                            <div className="text-center">
                              <p className="font-medium">{color.name}</p>
                              <p className="opacity-70 text-[11px]">{color.usage}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Custom color */}
        <div className="border-t pt-3 mt-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Custom Color
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => nativeRef.current?.click()}
              className="w-9 h-9 rounded-md border border-gray-300 shrink-0 cursor-pointer"
              style={{ backgroundColor: customColor }}
            />
            <input
              ref={nativeRef}
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="sr-only"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCustomColor(v);
              }}
              placeholder="#000000"
              className="flex-1 px-3 py-1.5 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/50"
            />
            <button
              type="button"
              onClick={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(customColor)) {
                  onSelect(customColor.toLowerCase());
                  onClose();
                }
              }}
              className="px-3 py-1.5 text-sm bg-[#1A2640] text-white rounded-md hover:bg-[#2C3E5C] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

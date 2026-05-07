import type { CSSProperties } from "react";

const FONT_FAMILIES: Record<string, string> = {
  heroTitle:
    "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
  sectionHeading:
    "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
  sectionTag: "var(--font-section-tag-family, Inter), sans-serif",
  subtitle:
    "var(--font-subtitle-family, 'Cormorant Garamond'), serif",
  body: "var(--font-body-family, Inter), sans-serif",
};

const STYLE_MODIFIERS: Record<
  string,
  { fontWeight?: number | string; fontStyle?: string }
> = {
  light: { fontWeight: 300, fontStyle: "normal" },
  "light-italic": { fontWeight: 300, fontStyle: "italic" },
  regular: { fontWeight: 400, fontStyle: "normal" },
  italic: { fontStyle: "italic" },
  "medium": { fontWeight: 500, fontStyle: "normal" },
  "medium-italic": { fontWeight: 500, fontStyle: "italic" },
  semibold: { fontWeight: 600, fontStyle: "normal" },
  "semibold-italic": { fontWeight: 600, fontStyle: "italic" },
  bold: { fontWeight: 700, fontStyle: "normal" },
  "bold-italic": { fontWeight: 700, fontStyle: "italic" },
};

/**
 * Resolve a compound font value ("family|style") into CSS overrides.
 *
 * Examples:
 *   ""                → null  (keep block default)
 *   "heroTitle"       → family only, default weight/style from preset
 *   "subtitle|italic" → subtitle family + italic override
 *   "|bold-italic"    → no family override, just bold italic
 */
export function resolveBlockFont(value: string): CSSProperties | null {
  if (!value) return null;

  const [familyKey, styleKey] = value.split("|");
  const result: CSSProperties = {};
  let hasOverride = false;

  // Family override
  if (familyKey && FONT_FAMILIES[familyKey]) {
    result.fontFamily = FONT_FAMILIES[familyKey];
    hasOverride = true;
  }

  // Style/weight override
  if (styleKey && STYLE_MODIFIERS[styleKey]) {
    const mod = STYLE_MODIFIERS[styleKey];
    if (mod.fontWeight !== undefined) {
      result.fontWeight = mod.fontWeight;
      hasOverride = true;
    }
    if (mod.fontStyle !== undefined) {
      result.fontStyle = mod.fontStyle;
      hasOverride = true;
    }
  }

  return hasOverride ? result : null;
}

/** Parse a compound value into its two parts for the editor UI. */
export function parseFontValue(value: string): {
  family: string;
  style: string;
} {
  if (!value) return { family: "", style: "" };
  const idx = value.indexOf("|");
  if (idx === -1) return { family: value, style: "" };
  return { family: value.slice(0, idx), style: value.slice(idx + 1) };
}

/** Join family + style back into the stored compound value. */
export function buildFontValue(family: string, style: string): string {
  if (!family && !style) return "";
  if (!style) return family;
  return `${family}|${style}`;
}

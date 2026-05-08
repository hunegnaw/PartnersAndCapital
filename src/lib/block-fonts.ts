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
 * Resolve a compound font value ("family|style|size") into CSS overrides.
 *
 * Examples:
 *   ""                     → null  (keep block default)
 *   "heroTitle"            → family only, default weight/style from preset
 *   "subtitle|italic"      → subtitle family + italic override
 *   "|bold-italic"         → no family override, just bold italic
 *   "heroTitle|bold|48px"  → family + bold + 48px size
 *   "||32px"               → size override only
 */
export function resolveBlockFont(value: string): CSSProperties | null {
  if (!value) return null;

  const [familyKey, styleKey, sizeKey] = value.split("|");
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

  // Size override
  if (sizeKey) {
    result.fontSize = sizeKey;
    hasOverride = true;
  }

  return hasOverride ? result : null;
}

/**
 * Resolve a compound font value into CSS custom properties for heading elements.
 *
 * Heading CSS rules use !important with var(--font-h2-size, 36px) etc.
 * Inline styles can't beat !important, but setting the CSS custom property
 * on the element feeds the value through the var() reference.
 *
 * Usage: <h2 style={{ ...resolveBlockFontVars(value, "h2") }}>
 */
export function resolveBlockFontVars(
  value: string,
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
): CSSProperties | null {
  if (!value) return null;

  const [familyKey, styleKey, sizeKey] = value.split("|");
  const vars: Record<string, string> = {};
  let hasOverride = false;

  if (familyKey && FONT_FAMILIES[familyKey]) {
    vars[`--font-${level}-family`] = FONT_FAMILIES[familyKey];
    hasOverride = true;
  }

  if (styleKey && STYLE_MODIFIERS[styleKey]) {
    const mod = STYLE_MODIFIERS[styleKey];
    if (mod.fontWeight !== undefined) {
      vars[`--font-${level}-weight`] = String(mod.fontWeight);
      hasOverride = true;
    }
    if (mod.fontStyle !== undefined) {
      vars[`--font-${level}-style`] = mod.fontStyle;
      hasOverride = true;
    }
  }

  if (sizeKey) {
    vars[`--font-${level}-size`] = sizeKey;
    hasOverride = true;
  }

  return hasOverride ? (vars as unknown as CSSProperties) : null;
}

/** Parse a compound value into its parts for the editor UI. */
export function parseFontValue(value: string): {
  family: string;
  style: string;
  size: string;
} {
  if (!value) return { family: "", style: "", size: "" };
  const parts = value.split("|");
  return {
    family: parts[0] ?? "",
    style: parts[1] ?? "",
    size: parts[2] ?? "",
  };
}

/** Join family + style + size back into the stored compound value. */
export function buildFontValue(family: string, style: string, size?: string): string {
  if (!family && !style && !size) return "";
  if (!size) {
    if (!style) return family;
    return `${family}|${style}`;
  }
  return `${family}|${style}|${size}`;
}

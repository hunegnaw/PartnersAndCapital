import type { CSSProperties } from "react";

export type FontPreset =
  | ""
  | "heroTitle"
  | "sectionHeading"
  | "sectionTag"
  | "subtitle"
  | "body";

const FONT_PRESETS: Record<
  string,
  { fontFamily: string; fontWeight: string; fontStyle: string }
> = {
  heroTitle: {
    fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
    fontWeight: "var(--font-hero-title-weight, 300)",
    fontStyle: "var(--font-hero-title-style, normal)",
  },
  sectionHeading: {
    fontFamily:
      "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
    fontWeight: "var(--font-section-heading-weight, 300)",
    fontStyle: "var(--font-section-heading-style, normal)",
  },
  sectionTag: {
    fontFamily: "var(--font-section-tag-family, Inter), sans-serif",
    fontWeight: "var(--font-section-tag-weight, 400)",
    fontStyle: "normal",
  },
  subtitle: {
    fontFamily: "var(--font-subtitle-family, 'Cormorant Garamond'), serif",
    fontWeight: "var(--font-subtitle-weight, 300)",
    fontStyle: "var(--font-subtitle-style, italic)",
  },
  body: {
    fontFamily: "var(--font-body-family, Inter), sans-serif",
    fontWeight: "var(--font-body-weight, 300)",
    fontStyle: "normal",
  },
};

/** Map a typography preset key to inline style overrides. Returns null for empty/unknown keys. */
export function resolveBlockFont(preset: string): CSSProperties | null {
  if (!preset) return null;
  const p = FONT_PRESETS[preset];
  if (!p) return null;
  return {
    fontFamily: p.fontFamily,
    fontWeight: p.fontWeight as unknown as number,
    fontStyle: p.fontStyle,
  };
}

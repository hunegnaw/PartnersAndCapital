export interface FontSetting {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  fontSize: string;
}

export interface TypographySettings {
  heroTitle: FontSetting;
  subtitle: FontSetting;
  body: FontSetting;
  adminBody: FontSetting;
  portalBody: FontSetting;
}

export const TYPOGRAPHY_CATEGORIES: { key: keyof TypographySettings; label: string }[] = [
  { key: "heroTitle", label: "Hero Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "body", label: "Body Text" },
  { key: "adminBody", label: "Admin Body" },
  { key: "portalBody", label: "Portal Body" },
];

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  heroTitle: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "500",
    fontStyle: "normal",
    color: "#ffffff",
    fontSize: "48px",
  },
  subtitle: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "500",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "24px",
  },
  body: {
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    color: "#333333",
    fontSize: "16px",
  },
  adminBody: {
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    color: "#333333",
    fontSize: "14px",
  },
  portalBody: {
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    color: "#333333",
    fontSize: "14px",
  },
};

/** Deep-merge saved typography over defaults */
export function mergeTypography(saved?: Partial<TypographySettings> | null): TypographySettings {
  if (!saved) return DEFAULT_TYPOGRAPHY;

  const result = { ...DEFAULT_TYPOGRAPHY };
  for (const key of Object.keys(DEFAULT_TYPOGRAPHY) as (keyof TypographySettings)[]) {
    if (saved[key]) {
      result[key] = { ...DEFAULT_TYPOGRAPHY[key], ...saved[key] };
    }
  }
  return result;
}

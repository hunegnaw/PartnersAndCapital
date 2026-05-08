export interface FontSetting {
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  fontSize: string;
}

export interface TypographySettings {
  heroTitle: FontSetting;
  sectionHeading: FontSetting;
  sectionTag: FontSetting;
  subtitle: FontSetting;
  body: FontSetting;
  adminBody: FontSetting;
  portalBody: FontSetting;
  h1: FontSetting;
  h2: FontSetting;
  h3: FontSetting;
  h4: FontSetting;
  h5: FontSetting;
  h6: FontSetting;
}

export const TYPOGRAPHY_CATEGORIES: { key: keyof TypographySettings; label: string }[] = [
  { key: "heroTitle", label: "Hero Title" },
  { key: "sectionHeading", label: "Section Heading" },
  { key: "sectionTag", label: "Section Tag / Label" },
  { key: "subtitle", label: "Subtitle" },
  { key: "body", label: "Body Text" },
  { key: "adminBody", label: "Admin Body" },
  { key: "portalBody", label: "Portal Body" },
  { key: "h1", label: "Heading 1" },
  { key: "h2", label: "Heading 2" },
  { key: "h3", label: "Heading 3" },
  { key: "h4", label: "Heading 4" },
  { key: "h5", label: "Heading 5" },
  { key: "h6", label: "Heading 6" },
];

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  heroTitle: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "300",
    fontStyle: "normal",
    color: "#ffffff",
    fontSize: "48px",
  },
  sectionHeading: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "300",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "48px",
  },
  sectionTag: {
    fontFamily: "Inter",
    fontWeight: "400",
    fontStyle: "normal",
    color: "#B07D3A",
    fontSize: "10px",
  },
  subtitle: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "300",
    fontStyle: "italic",
    color: "#888780",
    fontSize: "18px",
  },
  body: {
    fontFamily: "Inter",
    fontWeight: "300",
    fontStyle: "normal",
    color: "#333333",
    fontSize: "13px",
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
  h1: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "300",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "48px",
  },
  h2: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "300",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "36px",
  },
  h3: {
    fontFamily: "Cormorant Garamond",
    fontWeight: "300",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "28px",
  },
  h4: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "22px",
  },
  h5: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "18px",
  },
  h6: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontStyle: "normal",
    color: "#1A2640",
    fontSize: "16px",
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

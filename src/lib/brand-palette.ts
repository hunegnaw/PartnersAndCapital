export interface BrandColor {
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

export interface BrandColorCategory {
  id: string;
  label: string;
  colors: BrandColor[];
}

export const BRAND_PALETTE: BrandColorCategory[] = [
  {
    id: "primary",
    label: "Primary Colors",
    colors: [
      { name: "Navy", hex: "#1A2640", rgb: "26, 38, 64", usage: "Primary bg, topbar, sidebar" },
      { name: "Gold", hex: "#B07D3A", rgb: "176, 125, 58", usage: "Accent, active states, CTA" },
      { name: "Gold Light", hex: "#E8D5B0", rgb: "232, 213, 176", usage: "\"PARTNERS\" on dark, champagne" },
    ],
  },
  {
    id: "secondary",
    label: "Secondary Colors",
    colors: [
      { name: "Navy Mid", hex: "#2C3E5C", rgb: "44, 62, 92", usage: "Sidebar, hover states" },
      { name: "Gold Dark", hex: "#7A5520", rgb: "122, 85, 32", usage: "\"PARTNERS\" on light" },
      { name: "Gold Tint", hex: "#FDF5E8", rgb: "253, 245, 232", usage: "Tags, alerts, selected rows" },
      { name: "White", hex: "#FFFFFF", rgb: "255, 255, 255", usage: "\"+ CAPITAL\" on dark" },
    ],
  },
  {
    id: "gold-scale",
    label: "Gold Scale",
    colors: [
      { name: "Gold 50", hex: "#FDF5E8", rgb: "253, 245, 232", usage: "Lightest gold tint" },
      { name: "Gold 100", hex: "#F5EDD8", rgb: "245, 237, 216", usage: "Light gold background" },
      { name: "Gold 200", hex: "#E8D5B0", rgb: "232, 213, 176", usage: "Gold light / champagne" },
      { name: "Gold 300", hex: "#D4B483", rgb: "212, 180, 131", usage: "Mid gold" },
      { name: "Gold 500", hex: "#B07D3A", rgb: "176, 125, 58", usage: "Primary gold" },
      { name: "Gold 700", hex: "#7A5520", rgb: "122, 85, 32", usage: "Dark gold" },
      { name: "Gold 900", hex: "#4A3010", rgb: "74, 48, 16", usage: "Deepest gold" },
    ],
  },
  {
    id: "navy-scale",
    label: "Navy Scale",
    colors: [
      { name: "Navy 50", hex: "#E8EBF0", rgb: "232, 235, 240", usage: "Lightest navy tint" },
      { name: "Navy 100", hex: "#C5CCE0", rgb: "197, 204, 224", usage: "Light navy" },
      { name: "Navy 200", hex: "#8899BB", rgb: "136, 153, 187", usage: "Muted navy" },
      { name: "Navy 300", hex: "#4D6094", rgb: "77, 96, 148", usage: "Mid navy" },
      { name: "Navy 500", hex: "#2C3E5C", rgb: "44, 62, 92", usage: "Navy mid" },
      { name: "Navy 700", hex: "#1A2640", rgb: "26, 38, 64", usage: "Primary navy" },
      { name: "Navy 900", hex: "#0D1420", rgb: "13, 20, 32", usage: "Deepest navy" },
    ],
  },
  {
    id: "neutral",
    label: "Neutral / UI",
    colors: [
      { name: "Dark Text", hex: "#1A1A18", rgb: "26, 26, 24", usage: "Darkest text" },
      { name: "Body Text", hex: "#333333", rgb: "51, 51, 51", usage: "Default body copy" },
      { name: "Muted Text", hex: "#888780", rgb: "136, 135, 128", usage: "Secondary text, captions" },
      { name: "Light Gray", hex: "#5F5E5A", rgb: "95, 94, 90", usage: "Borders, subtle text" },
    ],
  },
];

/** Flat array of all unique hex values (lowercased, deduplicated) */
export function getAllBrandHexValues(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cat of BRAND_PALETTE) {
    for (const color of cat.colors) {
      const hex = color.hex.toLowerCase();
      if (!seen.has(hex)) {
        seen.add(hex);
        result.push(hex);
      }
    }
  }
  return result;
}

/** Look up a brand color by hex (case-insensitive) */
export function findBrandColor(hex: string): BrandColor | undefined {
  const normalized = hex.toLowerCase();
  for (const cat of BRAND_PALETTE) {
    for (const color of cat.colors) {
      if (color.hex.toLowerCase() === normalized) return color;
    }
  }
  return undefined;
}

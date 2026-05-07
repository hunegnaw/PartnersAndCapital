/** Curated list of popular Google Fonts */
export const GOOGLE_FONTS = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Poppins",
  "Merriweather",
  "Playfair Display",
  "Nunito",
  "PT Sans",
  "PT Serif",
  "Source Sans 3",
  "Source Serif 4",
  "Roboto Slab",
  "Ubuntu",
  "Noto Sans",
  "Noto Serif",
  "Libre Baskerville",
  "Crimson Text",
  "EB Garamond",
  "Cormorant Garamond",
  "Lora",
  "Bitter",
  "Arvo",
  "Josefin Sans",
  "Quicksand",
  "Cabin",
  "Titillium Web",
  "Archivo",
  "Work Sans",
  "Inter",
  "Rubik",
  "Barlow",
  "DM Sans",
  "DM Serif Display",
  "Spectral",
  "Vollkorn",
  "Alegreya",
  "Geist",
];

/** Returns the Google Fonts CSS import URL for given font families. */
export function getGoogleFontUrl(families: string[]): string {
  const filtered = families.filter((f) => f !== "Geist"); // Geist is loaded locally via next/font
  if (filtered.length === 0) return "";
  // Use specific weights instead of ranges — ranges fail if a font
  // doesn't support the full span (e.g. Cormorant Garamond is 300-700).
  const weights = "300;400;500;600;700;800;900";
  const params = filtered
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@${weights}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

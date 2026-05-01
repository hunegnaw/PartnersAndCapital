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
  const params = families
    .filter((f) => f !== "Geist") // Geist is loaded locally via next/font
    .map((f) => `family=${f.replace(/ /g, "+")}:ital,wght@0,100..900;1,100..900`)
    .join("&");
  if (!params) return "";
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

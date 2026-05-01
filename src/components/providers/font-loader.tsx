"use client";

import { useEffect, useMemo } from "react";
import { useOrganization } from "./organization-provider";
import { getGoogleFontUrl } from "@/lib/google-fonts";
import type { TypographySettings } from "@/lib/typography";

function getCSSVariables(typography: TypographySettings): string {
  const vars: string[] = [];
  const categories = [
    { key: "heroTitle", prefix: "hero-title" },
    { key: "subtitle", prefix: "subtitle" },
    { key: "body", prefix: "body" },
    { key: "adminBody", prefix: "admin-body" },
    { key: "portalBody", prefix: "portal-body" },
  ] as const;

  for (const { key, prefix } of categories) {
    const setting = typography[key];
    vars.push(`--font-${prefix}-family: '${setting.fontFamily}', sans-serif;`);
    vars.push(`--font-${prefix}-weight: ${setting.fontWeight};`);
    vars.push(`--font-${prefix}-style: ${setting.fontStyle};`);
    vars.push(`--font-${prefix}-color: ${setting.color};`);
    vars.push(`--font-${prefix}-size: ${setting.fontSize};`);
  }

  return `:root {\n  ${vars.join("\n  ")}\n}`;
}

export function FontLoader() {
  const org = useOrganization();
  const typography = org.typography;

  // Collect unique font families
  const families = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(typography) as (keyof TypographySettings)[]) {
      set.add(typography[key].fontFamily);
    }
    return Array.from(set);
  }, [typography]);

  const fontUrl = useMemo(() => getGoogleFontUrl(families), [families]);
  const cssVars = useMemo(() => getCSSVariables(typography), [typography]);

  useEffect(() => {
    // Inject Google Fonts link
    if (!fontUrl) return;
    const linkId = "typography-google-fonts";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (link) {
      link.href = fontUrl;
    } else {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  }, [fontUrl]);

  useEffect(() => {
    // Inject CSS variables
    const styleId = "typography-css-vars";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (style) {
      style.textContent = cssVars;
    } else {
      style = document.createElement("style");
      style.id = styleId;
      style.textContent = cssVars;
      document.head.appendChild(style);
    }
  }, [cssVars]);

  return null;
}

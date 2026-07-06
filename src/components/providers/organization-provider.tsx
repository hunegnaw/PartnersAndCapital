"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { mergeTypography, type TypographySettings } from "@/lib/typography";
import { mergeFooter, type FooterConfig } from "@/lib/footer";

interface OrgConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  logoScrolledUrl?: string | null;
  faviconUrl?: string | null;
  disclaimer?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  typography: TypographySettings;
  footer: FooterConfig;
}

const defaultOrg: OrgConfig = {
  name: process.env.NEXT_PUBLIC_ORG_NAME || "Partners + Capital",
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#1A2640",
  secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#2563eb",
  accentColor: process.env.NEXT_PUBLIC_ACCENT_COLOR || "#f59e0b",
  typography: mergeTypography(),
  footer: mergeFooter(),
};

const OrganizationContext = createContext<OrgConfig>(defaultOrg);

export function useOrganization() {
  return useContext(OrganizationContext);
}

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [org, setOrg] = useState<OrgConfig>(defaultOrg);

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.json())
      .then((data) => {
        setOrg({
          name: data.name || defaultOrg.name,
          primaryColor: data.primaryColor || defaultOrg.primaryColor,
          secondaryColor: data.secondaryColor || defaultOrg.secondaryColor,
          accentColor: data.accentColor || defaultOrg.accentColor,
          logoUrl: data.logoUrl,
          logoScrolledUrl: data.logoScrolledUrl,
          faviconUrl: data.faviconUrl,
          disclaimer: data.disclaimer,
          email: data.email,
          phone: data.phone,
          address: data.address,
          typography: mergeTypography(data.typography),
          footer: mergeFooter(data.footer),
        });
      })
      .catch(console.error);
  }, []);

  // When the organization sets a custom favicon, override the built-in default
  // (the app/icon.png + app/favicon.ico file-convention icons). We remove those
  // link tags and point to the org favicon so it's the authoritative icon; if no
  // org favicon is set, the built-in default is left in place.
  useEffect(() => {
    const favicon = org.faviconUrl;
    if (!favicon) return;
    const head = document.head;
    head
      .querySelectorAll("link[rel~='icon']")
      .forEach((el) => el.remove());
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = favicon;
    head.appendChild(link);
  }, [org.faviconUrl]);

  return (
    <OrganizationContext.Provider value={org}>
      {children}
    </OrganizationContext.Provider>
  );
}

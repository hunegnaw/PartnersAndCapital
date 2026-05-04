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

  return (
    <OrganizationContext.Provider value={org}>
      {children}
    </OrganizationContext.Provider>
  );
}

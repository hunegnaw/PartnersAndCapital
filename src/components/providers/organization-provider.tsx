"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface OrgConfig {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  disclaimer?: string | null;
}

const defaultOrg: OrgConfig = {
  name: process.env.NEXT_PUBLIC_ORG_NAME || "Partners + Capital",
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#1e3a5f",
  secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#2563eb",
  accentColor: process.env.NEXT_PUBLIC_ACCENT_COLOR || "#f59e0b",
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

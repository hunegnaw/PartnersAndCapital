export interface FooterModules {
  logo: boolean;
  navigation: boolean;
  newsletter: boolean;
  contact: boolean;
  tagline: boolean;
  copyright: boolean;
  disclaimer: boolean;
  legalLinks: boolean;
  investments: boolean;
}

export interface FooterLink {
  label: string;
  url: string;
  source?: "custom" | "page";
  pageId?: string;
}

export interface FooterInvestmentLink {
  assetClassId: string;
  assetClassName: string;
  url: string;
  visible: boolean;
}

export interface FooterNavColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterConfig {
  modules: FooterModules;
  logoUrl: string | null;
  tagline: string;
  newsletterHeading: string;
  newsletterDescription: string;
  copyrightStartYear: string;
  copyrightEntity: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  links: FooterLink[];
  navColumns: FooterNavColumn[];
  investmentLinks: FooterInvestmentLink[];
}

export const DEFAULT_FOOTER: FooterConfig = {
  modules: {
    logo: false,
    navigation: true,
    newsletter: true,
    contact: true,
    tagline: true,
    copyright: true,
    disclaimer: true,
    legalLinks: true,
    investments: true,
  },
  logoUrl: null,
  tagline: "Public Access to Private Markets",
  newsletterHeading: "Stay Updated",
  newsletterDescription: "",
  copyrightStartYear: "2015",
  copyrightEntity: "Partners + Capital, LLC",
  backgroundColor: "#1A2640",
  textColor: "#ffffff",
  accentColor: "#B07D3A",
  links: [
    { label: "Privacy Policy", url: "/privacy-policy" },
    { label: "Terms of Use", url: "/terms-of-use" },
  ],
  navColumns: [],
  investmentLinks: [],
};

/** Deep-merge saved footer config over defaults */
export function mergeFooter(saved?: Partial<FooterConfig> | null): FooterConfig {
  if (!saved) return DEFAULT_FOOTER;

  return {
    ...DEFAULT_FOOTER,
    ...saved,
    modules: {
      ...DEFAULT_FOOTER.modules,
      ...(saved.modules || {}),
    },
    links: Array.isArray(saved.links) ? saved.links : DEFAULT_FOOTER.links,
    navColumns: Array.isArray(saved.navColumns) ? saved.navColumns : DEFAULT_FOOTER.navColumns,
    investmentLinks: Array.isArray(saved.investmentLinks) ? saved.investmentLinks : DEFAULT_FOOTER.investmentLinks,
  };
}

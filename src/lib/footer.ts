export interface FooterModules {
  logo: boolean;
  navigation: boolean;
  newsletter: boolean;
  contact: boolean;
  tagline: boolean;
  copyright: boolean;
  disclaimer: boolean;
  legalLinks: boolean;
}

export interface FooterLink {
  label: string;
  url: string;
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
    legalLinks: false,
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
  links: [],
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
  };
}

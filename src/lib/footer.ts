export interface FooterModules {
  logo: boolean;
  navigation: boolean;
  newsletter: boolean;
  contact: boolean;
  tagline: boolean;
  copyright: boolean;
  disclaimer: boolean;
}

export interface FooterConfig {
  modules: FooterModules;
  logoUrl: string | null;
  tagline: string;
  copyrightStartYear: string;
  copyrightEntity: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
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
  },
  logoUrl: null,
  tagline: "Public Access to Private Markets",
  copyrightStartYear: "2015",
  copyrightEntity: "Partners + Capital, LLC",
  backgroundColor: "#1A2640",
  textColor: "#ffffff",
  accentColor: "#B07D3A",
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
  };
}

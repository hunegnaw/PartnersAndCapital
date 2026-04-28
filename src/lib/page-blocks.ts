export const BLOCK_TYPES = {
  hero_video: {
    label: "Hero (Video)",
    icon: "Video",
    description: "Video background with overlay text and CTA",
    defaultProps: {
      videoUrl: "",
      posterImageUrl: "",
      heading: "",
      subheading: "",
      ctaText: "",
      ctaUrl: "",
      overlayOpacity: 0.5,
    },
  },
  hero_image: {
    label: "Hero (Image)",
    icon: "Image",
    description: "Image background with overlay text and CTA",
    defaultProps: {
      imageUrl: "",
      heading: "",
      subheading: "",
      ctaText: "",
      ctaUrl: "",
      overlayOpacity: 0.4,
    },
  },
  text_section: {
    label: "Text Section",
    icon: "Type",
    description: "Rich text content area",
    defaultProps: {
      content: "",
      maxWidth: "4xl",
      backgroundColor: "transparent",
      textColor: "",
      paddingY: "md",
    },
  },
  logo_gallery: {
    label: "Logo Gallery",
    icon: "Grid3X3",
    description: "Grid of logos or images",
    defaultProps: {
      heading: "",
      logos: [] as { imageUrl: string; alt: string; url?: string }[],
      columns: 4,
      grayscale: true,
    },
  },
  stats: {
    label: "Stats",
    icon: "BarChart3",
    description: "Number cards in a row",
    defaultProps: {
      heading: "",
      stats: [] as { value: string; label: string }[],
      backgroundColor: "#0f1c2e",
    },
  },
  cta_banner: {
    label: "CTA Banner",
    icon: "Megaphone",
    description: "Full-width call to action",
    defaultProps: {
      heading: "",
      text: "",
      ctaText: "",
      ctaUrl: "",
      backgroundColor: "#b8860b",
    },
  },
  two_column: {
    label: "Two Column",
    icon: "Columns2",
    description: "Side-by-side content areas",
    defaultProps: {
      leftContent: "",
      rightContent: "",
      leftWidth: "1/2",
    },
  },
  contact_form: {
    label: "Contact Form",
    icon: "Mail",
    description: "Name, email, and message form",
    defaultProps: {
      heading: "Get in Touch",
      description: "",
      showAddress: true,
      showEmail: true,
    },
  },
  newsletter_signup: {
    label: "Newsletter Signup",
    icon: "Newspaper",
    description: "Email signup form",
    defaultProps: {
      heading: "Stay Updated",
      description: "",
      backgroundColor: "#0f1c2e",
    },
  },
  quote: {
    label: "Quote",
    icon: "Quote",
    description: "Blockquote with attribution",
    defaultProps: {
      text: "",
      attribution: "",
      role: "",
    },
  },
  image: {
    label: "Image",
    icon: "ImageIcon",
    description: "Single image with caption",
    defaultProps: {
      imageUrl: "",
      alt: "",
      caption: "",
      maxWidth: "4xl",
    },
  },
  embed: {
    label: "Video Embed",
    icon: "Play",
    description: "YouTube or Vimeo embed",
    defaultProps: {
      url: "",
      title: "",
      aspectRatio: "16/9",
    },
  },
  spacer: {
    label: "Spacer",
    icon: "Minus",
    description: "Vertical space",
    defaultProps: {
      height: "md",
    },
  },
} as const;

export type BlockType = keyof typeof BLOCK_TYPES;

export interface PageBlockData {
  id?: string;
  type: BlockType;
  props: Record<string, unknown>;
  sortOrder: number;
  mediaId?: string | null;
}

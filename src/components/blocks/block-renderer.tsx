import { HeroVideoBlock } from "./hero-video-block";
import { HeroImageBlock } from "./hero-image-block";
import { TextSectionBlock } from "./text-section-block";
import { LogoGalleryBlock } from "./logo-gallery-block";
import { StatsBlock } from "./stats-block";
import { CtaBannerBlock } from "./cta-banner-block";
import { TwoColumnBlock } from "./two-column-block";
import { ContactFormBlock } from "./contact-form-block";
import { NewsletterSignupBlock } from "./newsletter-signup-block";
import { QuoteBlock } from "./quote-block";
import { ImageBlock } from "./image-block";
import { EmbedBlock } from "./embed-block";
import { SpacerBlock } from "./spacer-block";

export const BLOCK_MAP: Record<
  string,
  React.ComponentType<{ props: Record<string, unknown> }>
> = {
  hero_video: HeroVideoBlock,
  hero_image: HeroImageBlock,
  text_section: TextSectionBlock,
  logo_gallery: LogoGalleryBlock,
  stats: StatsBlock,
  cta_banner: CtaBannerBlock,
  two_column: TwoColumnBlock,
  contact_form: ContactFormBlock,
  newsletter_signup: NewsletterSignupBlock,
  quote: QuoteBlock,
  image: ImageBlock,
  embed: EmbedBlock,
  spacer: SpacerBlock,
};

interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
  sortOrder: number;
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((block) => {
          const Component = BLOCK_MAP[block.type];
          if (!Component) return null;
          return <Component key={block.id} props={block.props} />;
        })}
    </>
  );
}

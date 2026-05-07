import { resolveBlockFont } from "@/lib/block-fonts";

interface HeroImageBlockProps {
  props: Record<string, unknown>;
}

export function HeroImageBlock({ props }: HeroImageBlockProps) {
  const heading = (props.heading as string) ?? "";
  const subheading = (props.subheading as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const imageUrl = (props.imageUrl as string) ?? "";
  const overlayOpacity = (props.overlayOpacity as number) ?? 0.5;
  const backgroundColor = (props.backgroundColor as string) ?? "#1A2640";
  const height = (props.height as string) ?? "70vh";

  const headingFont = resolveBlockFont((props.headingFont as string) || "");
  const subheadingFont = resolveBlockFont((props.subheadingFont as string) || "");

  const headingColor = (props.headingColor as string) || "";
  const subheadingColor = (props.subheadingColor as string) || "";
  const ctaButtonColor = (props.ctaButtonColor as string) || "#B07D3A";
  const ctaButtonTextColor = (props.ctaButtonTextColor as string) || "#1A2640";

  return (
    <section
      className="relative flex items-center justify-center bg-cover bg-center"
      style={{
        minHeight: height,
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundColor,
      }}
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {heading && (
          <h1
            className="heading-dark leading-[1.05] tracking-tight text-white"
            style={{
              fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
              fontWeight: "var(--font-hero-title-weight, 300)" as unknown as number,
              fontStyle: "var(--font-hero-title-style, normal)",
              fontSize: "clamp(48px, 7vw, 88px)",
              ...(headingFont ?? {}),
              ...(headingColor ? { color: headingColor } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: heading }}
          />
        )}
        {subheading && (
          <p
            className="subtitle-font mt-6"
            style={{
              fontFamily: "var(--font-subtitle-family, 'Cormorant Garamond'), serif",
              fontWeight: "var(--font-subtitle-weight, 300)" as unknown as number,
              fontStyle: "var(--font-subtitle-style, italic)",
              fontSize: "clamp(16px, 2vw, 22px)",
              lineHeight: 1.6,
              color: subheadingColor || "rgba(232,213,176,0.65)",
              ...(subheadingFont ?? {}),
            }}
            dangerouslySetInnerHTML={{ __html: subheading }}
          />
        )}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-10 inline-block px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.12em] transition hover:brightness-110"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              backgroundColor: ctaButtonColor,
              color: ctaButtonTextColor,
            }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

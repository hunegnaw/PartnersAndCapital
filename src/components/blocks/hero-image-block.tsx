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
  const textColor = (props.textColor as string) ?? "#ffffff";
  const height = (props.height as string) ?? "70vh";

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
            className="text-5xl font-bold tracking-tight md:text-7xl"
            style={{ color: textColor }}
          >
            {heading}
          </h1>
        )}
        {subheading && (
          <p className="mt-6 text-xl" style={{ color: textColor, opacity: 0.8 }}>{subheading}</p>
        )}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-8 inline-block rounded-full bg-[#B07D3A] px-8 py-3 text-lg font-semibold text-white transition hover:bg-[#7A5520]"
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

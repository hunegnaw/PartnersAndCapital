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

  return (
    <section
      className="relative flex min-h-[70vh] items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundColor: imageUrl ? undefined : "#0f1c2e",
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
          <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl">
            {heading}
          </h1>
        )}
        {subheading && (
          <p className="mt-6 text-xl text-white/80">{subheading}</p>
        )}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-8 inline-block rounded-full bg-[#b8860b] px-8 py-3 text-lg font-semibold text-white transition hover:bg-[#a0750a]"
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

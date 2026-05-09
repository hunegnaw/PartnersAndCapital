interface PageHeroProps {
  title: string;
  imageUrl?: string | null;
  tagline?: string | null;
  subtitle?: string | null;
  description?: string | null;
  showGrid?: boolean;
  showDivider?: boolean;
}

export function PageHero({
  title,
  imageUrl,
  tagline,
  subtitle,
  description,
  showGrid = false,
  showDivider = false,
}: PageHeroProps) {
  const hasImage = !!imageUrl;
  const backgroundColor = "#1A2640";
  const overlayOpacity = hasImage ? 0.6 : 0;

  return (
    <section
      className="relative flex items-center bg-cover bg-center"
      style={{
        minHeight: "600px",
        backgroundImage: hasImage ? `url(${imageUrl})` : undefined,
        backgroundColor,
      }}
    >
      {/* Dark overlay for image backgrounds */}
      {hasImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Grid pattern overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      )}

      {/* Radial gradient overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 80% 20%, rgba(176,125,58,0.08) 0%, transparent 60%)",
          }}
        />
      )}

      {/* Content — px-6 matches the header nav padding for flush left alignment */}
      <div className="relative z-10 w-full px-6 py-24">
        <div className="max-w-3xl flex flex-col items-start text-left">
          {/* Tagline */}
          {tagline && (
            <div className="mb-6 flex items-center gap-3">
              <span
                className="inline-block h-px w-6"
                style={{ backgroundColor: "#B07D3A" }}
              />
              <span
                className="uppercase tracking-[0.18em]"
                style={{
                  fontFamily:
                    "var(--font-section-tag-family, Inter), sans-serif",
                  fontSize: "var(--font-section-tag-size, 10px)",
                  fontWeight:
                    "var(--font-section-tag-weight, 400)" as unknown as number,
                  color: "var(--font-section-tag-color, #B07D3A)",
                }}
              >
                {tagline}
              </span>
            </div>
          )}

          {/* Heading — supports <em> for gold italic accent via heading-dark class */}
          <h1
            className="heading-dark leading-[1.05] tracking-tight"
            style={{
              fontFamily:
                "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
              fontWeight:
                "var(--font-hero-title-weight, 300)" as unknown as number,
              fontStyle: "var(--font-hero-title-style, normal)",
              color: "var(--font-hero-title-color, #ffffff)",
              fontSize: "clamp(40px, 6vw, 72px)",
            }}
            dangerouslySetInnerHTML={{ __html: title }}
          />

          {/* Subtitle — italic serif in gold, same large size as heading */}
          {subtitle && (
            <p
              className="subtitle-font mt-1"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontStyle: "italic",
                fontSize: "clamp(40px, 6vw, 72px)",
                lineHeight: 1.05,
                color: "#E8D5B0",
              }}
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />
          )}

          {/* Description */}
          {description && (
            <p
              className="subtitle-font mt-8"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontStyle: "italic",
                fontSize: "clamp(16px, 2vw, 22px)",
                lineHeight: 1.6,
                color: "rgba(232,213,176,0.65)",
              }}
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </div>
      </div>

      {/* Bottom divider */}
      {showDivider && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #B07D3A 50%, transparent 100%)",
          }}
        />
      )}
    </section>
  );
}

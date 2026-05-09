import { resolveBlockFont, resolveBlockFontVars } from "@/lib/block-fonts";

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
  const textAlign = (props.textAlign as string) ?? "center";
  const tagline = (props.tagline as string) ?? "";
  const showGrid = !!props.showGrid;
  const showDivider = !!props.showDivider;

  const headingFont = resolveBlockFontVars((props.headingFont as string) || "", "h1");
  const subheadingFont = resolveBlockFont((props.subheadingFont as string) || "");
  const ctaButtonFont = resolveBlockFont((props.ctaButtonFont as string) || "");
  const taglineFont = resolveBlockFont((props.taglineFont as string) || "");

  const headingColor = (props.headingColor as string) || "";
  const subheadingColor = (props.subheadingColor as string) || "";
  const ctaButtonColor = (props.ctaButtonColor as string) || "#B07D3A";
  const ctaButtonTextColor = (props.ctaButtonTextColor as string) || "#1A2640";
  const taglineColor = (props.taglineColor as string) || "";

  const alignClass =
    textAlign === "left"
      ? "text-left items-start"
      : textAlign === "right"
        ? "text-right items-end"
        : "text-center items-center";

  const contentMaxWidth =
    textAlign === "center" ? "max-w-4xl" : "max-w-3xl";

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

      {/* Content */}
      <div
        className={`relative z-10 mx-auto ${contentMaxWidth} px-6 flex flex-col ${alignClass}`}
        style={{
          justifyContent: textAlign === "left" ? "flex-end" : "center",
        }}
      >
        {tagline && (
          <div className="mb-4 flex items-center gap-3">
            <span
              className="inline-block h-px w-6"
              style={{
                backgroundColor:
                  taglineColor || "var(--font-section-tag-color, #B07D3A)",
              }}
            />
            <span
              className="uppercase tracking-[0.18em]"
              style={{
                fontFamily:
                  "var(--font-section-tag-family, Inter), sans-serif",
                fontSize: "var(--font-section-tag-size, 10px)",
                fontWeight:
                  "var(--font-section-tag-weight, 400)" as unknown as number,
                color:
                  taglineColor || "var(--font-section-tag-color, #B07D3A)",
                ...(taglineFont ?? {}),
              }}
            >
              {tagline}
            </span>
          </div>
        )}
        {heading && (
          <h1
            className="heading-dark leading-[1.05] tracking-tight text-white"
            style={{
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
              ...(ctaButtonFont ?? {}),
            }}
          >
            {ctaText}
          </a>
        )}
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

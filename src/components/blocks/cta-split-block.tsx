"use client";

interface CtaSplitBlockProps {
  props: Record<string, unknown>;
}

export function CtaSplitBlock({ props }: CtaSplitBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const description = (props.description as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const ctaText2 = (props.ctaText2 as string) ?? "";
  const ctaUrl2 = (props.ctaUrl2 as string) ?? "";
  const bullets = (props.bullets as { text: string }[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";
  const textColor = (props.textColor as string) || "";
  const maxWidth = (props.maxWidth as string) ?? "xl";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  return (
    <section style={{ backgroundColor }} className="py-24 md:py-28">
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-7xl"} px-6 md:px-12 lg:px-16`}>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Left — CTA content */}
          <div>
            {tagline && (
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="inline-block h-px w-6"
                  style={{ backgroundColor: "var(--font-section-tag-color, #B07D3A)" }}
                />
                <span
                  className="uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-section-tag-family, Inter), sans-serif",
                    fontSize: "var(--font-section-tag-size, 10px)",
                    fontWeight: "var(--font-section-tag-weight, 400)" as unknown as number,
                    color: "var(--font-section-tag-color, #B07D3A)",
                  }}
                >
                  {tagline}
                </span>
              </div>
            )}
            {heading && (
              <h2
                className="heading-light leading-[1.15] mb-4"
                style={{
                  fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                  fontWeight: "var(--font-section-heading-weight, 300)" as unknown as number,
                  fontStyle: "var(--font-section-heading-style, normal)",
                  color: textColor || "var(--font-section-heading-color, #1A2640)",
                  fontSize: "clamp(32px, 4vw, 52px)",
                }}
                dangerouslySetInnerHTML={{ __html: heading }}
              />
            )}
            {description && (
              <p
                className="leading-[1.8]"
                style={{
                  fontFamily: "var(--font-body-family, Inter), sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                  color: "#888780",
                }}
              >
                {description}
              </p>
            )}
            {(ctaText || ctaText2) && (
              <div className="mt-8 flex flex-wrap gap-3">
                {ctaText && ctaUrl && (
                  <a
                    href={ctaUrl}
                    className="inline-block px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.12em] transition hover:brightness-110"
                    style={{
                      fontFamily: "var(--font-body-family, Inter), sans-serif",
                      backgroundColor: "#B07D3A",
                      color: "#1A2640",
                    }}
                  >
                    {ctaText}
                  </a>
                )}
                {ctaText2 && ctaUrl2 && (
                  <a
                    href={ctaUrl2}
                    className="inline-block px-8 py-3.5 text-[11px] font-normal uppercase tracking-[0.12em] transition hover:bg-gray-100"
                    style={{
                      fontFamily: "var(--font-body-family, Inter), sans-serif",
                      border: "0.5px solid rgba(26,38,64,0.3)",
                      color: "#2C3E5C",
                    }}
                  >
                    {ctaText2}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right — bullet list */}
          {bullets.length > 0 && (
            <div
              className="border-l pl-10 lg:pl-16"
              style={{ borderColor: "rgba(26,38,64,0.12)" }}
            >
              <div className="flex flex-col gap-4">
                {bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-3.5">
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: "#B07D3A" }}
                    />
                    <span
                      className="leading-[1.6]"
                      style={{
                        fontFamily: "var(--font-body-family, Inter), sans-serif",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: "#1A1A18",
                      }}
                      dangerouslySetInnerHTML={{ __html: bullet.text }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

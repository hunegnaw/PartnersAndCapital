"use client";

interface PhilosophyBlockProps {
  props: Record<string, unknown>;
}

export function PhilosophyBlock({ props }: PhilosophyBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const quote = (props.quote as string) ?? "";
  const attribution = (props.attribution as string) ?? "";
  const pillars =
    (props.pillars as { name: string; description: string }[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) || "#1A2640";

  return (
    <section
      className="relative overflow-hidden py-24 md:py-32"
      style={{
        backgroundColor,
        backgroundImage:
          "radial-gradient(ellipse at 80% 20%, rgba(176,125,58,0.06) 0%, transparent 50%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left — quote */}
          <div>
            {tagline && (
              <div className="mb-6 flex items-center gap-3">
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
            {quote && (
              <blockquote
                className="leading-[1.3]"
                style={{
                  fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                  fontWeight: 300,
                  fontStyle: "italic",
                  fontSize: "clamp(28px, 4vw, 48px)",
                  color: "rgba(255,255,255,0.9)",
                }}
                dangerouslySetInnerHTML={{ __html: `\u201c${quote}\u201d` }}
              />
            )}
            {attribution && (
              <div className="mt-8 flex items-center gap-3">
                <span
                  className="inline-block h-px w-6"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                />
                <span
                  className="uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-body-family, Inter), sans-serif",
                    fontSize: "10px",
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {attribution}
                </span>
              </div>
            )}
          </div>

          {/* Right — pillars */}
          {pillars.length > 0 && (
            <div className="flex flex-col justify-center gap-5">
              {pillars.map((pillar, i) => (
                <div
                  key={i}
                  className="border-l pl-5"
                  style={{ borderColor: "rgba(176,125,58,0.3)" }}
                >
                  <h3
                    className="mb-1"
                    style={{
                      fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#E8D5B0",
                    }}
                  >
                    {pillar.name}
                  </h3>
                  <p
                    className="max-w-[200px] leading-[1.5]"
                    style={{
                      fontFamily: "var(--font-body-family, Inter), sans-serif",
                      fontSize: "11px",
                      fontWeight: 300,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

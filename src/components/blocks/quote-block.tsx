interface QuoteBlockProps {
  props: Record<string, unknown>;
}

export function QuoteBlock({ props }: QuoteBlockProps) {
  const quote = (props.text as string) ?? "";
  const attribution = (props.attribution as string) ?? "";
  const role = (props.role as string) ?? "";
  const maxWidth = (props.maxWidth as string) ?? "sm";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  return (
    <section className="py-20">
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-4xl"} px-6 md:px-12`}>
        <blockquote
          className="border-l pl-6"
          style={{ borderColor: "rgba(176,125,58,0.3)" }}
        >
          <p
            className="leading-[1.3]"
            style={{
              fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: "clamp(24px, 3vw, 36px)",
              color: "rgba(26,38,64,0.9)",
            }}
          >
            &ldquo;{quote}&rdquo;
          </p>
          {(attribution || role) && (
            <footer className="mt-6 flex items-center gap-3">
              <span
                className="inline-block h-px w-6"
                style={{ backgroundColor: "#B07D3A" }}
              />
              <div>
                {attribution && (
                  <cite
                    className="not-italic"
                    style={{
                      fontFamily: "var(--font-body-family, Inter), sans-serif",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#1A2640",
                    }}
                  >
                    {attribution}
                  </cite>
                )}
                {role && (
                  <span
                    className="block"
                    style={{
                      fontFamily: "var(--font-body-family, Inter), sans-serif",
                      fontSize: "11px",
                      fontWeight: 300,
                      color: "#888780",
                    }}
                  >
                    {role}
                  </span>
                )}
              </div>
            </footer>
          )}
        </blockquote>
      </div>
    </section>
  );
}

interface CtaBannerBlockProps {
  props: Record<string, unknown>;
}

export function CtaBannerBlock({ props }: CtaBannerBlockProps) {
  const heading = (props.heading as string) ?? "";
  const text = (props.text as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const backgroundColor = (props.backgroundColor as string) ?? "#1A2640";

  return (
    <section className="py-24" style={{ backgroundColor }}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        {heading && (
          <h2
            className="leading-[1.15]"
            style={{
              fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
              fontWeight: "var(--font-section-heading-weight, 300)" as unknown as number,
              fontSize: "clamp(32px, 4vw, 52px)",
              color: "#ffffff",
            }}
            dangerouslySetInnerHTML={{ __html: heading }}
          />
        )}
        {text && (
          <p
            className="mt-4 leading-[1.7]"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {text}
          </p>
        )}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-10 inline-block px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.12em] transition hover:brightness-110"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              backgroundColor: "#B07D3A",
              color: "#1A2640",
            }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

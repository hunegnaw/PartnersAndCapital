interface CtaBannerBlockProps {
  props: Record<string, unknown>;
}

export function CtaBannerBlock({ props }: CtaBannerBlockProps) {
  const heading = (props.heading as string) ?? "";
  const text = (props.text as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const backgroundColor = (props.backgroundColor as string) ?? "#1A2640";
  const headingColor = (props.headingColor as string) || "#ffffff";
  const textColor = (props.textColor as string) || "#ffffffaa";
  const ctaButtonColor = (props.ctaButtonColor as string) || "#1A2640";
  const ctaButtonTextColor = (props.ctaButtonTextColor as string) || "#ffffff";
  const maxWidth = (props.maxWidth as string) ?? "sm";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  return (
    <section className="py-24" style={{ backgroundColor }}>
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-4xl"} px-6 text-center`}>
        {heading && (
          <h2
            className="heading-dark leading-[1.15]"
            style={{
              fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
              fontWeight: "var(--font-section-heading-weight, 300)" as unknown as number,
              fontSize: "clamp(32px, 4vw, 52px)",
              color: headingColor,
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
              color: textColor,
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

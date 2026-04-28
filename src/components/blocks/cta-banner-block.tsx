interface CtaBannerBlockProps {
  props: Record<string, unknown>;
}

export function CtaBannerBlock({ props }: CtaBannerBlockProps) {
  const heading = (props.heading as string) ?? "";
  const text = (props.text as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const backgroundColor = (props.backgroundColor as string) ?? "#0f1c2e";

  return (
    <section className="py-20" style={{ backgroundColor }}>
      <div className="mx-auto max-w-4xl px-6 text-center">
        {heading && (
          <h2 className="text-3xl font-bold text-white">{heading}</h2>
        )}
        {text && <p className="mt-4 text-lg text-white/80">{text}</p>}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-lg font-semibold text-[#0f1c2e] transition hover:bg-white/90"
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

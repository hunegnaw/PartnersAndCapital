interface QuoteBlockProps {
  props: Record<string, unknown>;
}

export function QuoteBlock({ props }: QuoteBlockProps) {
  const quote = (props.quote as string) ?? "";
  const attribution = (props.attribution as string) ?? "";
  const role = (props.role as string) ?? "";

  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-6">
        <blockquote className="border-l-4 border-[#b8860b] pl-6">
          <p className="text-2xl italic text-[#0f1c2e]/90 leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
          {(attribution || role) && (
            <footer className="mt-4">
              {attribution && (
                <cite className="not-italic font-semibold text-[#0f1c2e]">
                  {attribution}
                </cite>
              )}
              {role && (
                <span className="block text-sm text-[#0f1c2e]/60">
                  {role}
                </span>
              )}
            </footer>
          )}
        </blockquote>
      </div>
    </section>
  );
}

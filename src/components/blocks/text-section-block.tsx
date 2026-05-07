interface TextSectionBlockProps {
  props: Record<string, unknown>;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  sm: "max-w-4xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
  // legacy keys
  "2xl": "max-w-4xl",
  "4xl": "max-w-5xl",
  "6xl": "max-w-6xl",
};

const PADDING_Y_MAP: Record<string, string> = {
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
  xl: "py-32",
};

export function TextSectionBlock({ props }: TextSectionBlockProps) {
  const content = (props.content as string) ?? "";
  const maxWidth = (props.maxWidth as string) ?? "md";
  const paddingY = (props.paddingY as string) ?? "md";
  const backgroundColor = (props.backgroundColor as string) ?? undefined;
  const textColor = (props.textColor as string) ?? undefined;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] ?? "max-w-5xl";
  const paddingYClass = PADDING_Y_MAP[paddingY] ?? "py-16";

  return (
    <section
      className={paddingYClass}
      style={{ backgroundColor, color: textColor }}
    >
      <div className={`mx-auto px-6 md:px-12 lg:px-16 ${maxWidthClass}`}>
        <div
          className="prose prose-lg max-w-none"
          style={{
            fontFamily: "var(--font-body-family, Inter), sans-serif",
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}

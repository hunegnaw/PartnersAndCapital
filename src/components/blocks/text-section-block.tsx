interface TextSectionBlockProps {
  props: Record<string, unknown>;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

const PADDING_Y_MAP: Record<string, string> = {
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
  xl: "py-32",
};

export function TextSectionBlock({ props }: TextSectionBlockProps) {
  const content = (props.content as string) ?? "";
  const maxWidth = (props.maxWidth as string) ?? "4xl";
  const paddingY = (props.paddingY as string) ?? "md";
  const backgroundColor = (props.backgroundColor as string) ?? undefined;
  const textColor = (props.textColor as string) ?? undefined;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] ?? "max-w-4xl";
  const paddingYClass = PADDING_Y_MAP[paddingY] ?? "py-16";

  return (
    <section
      className={paddingYClass}
      style={{ backgroundColor, color: textColor }}
    >
      <div className={`mx-auto px-6 ${maxWidthClass}`}>
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}

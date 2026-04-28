interface TwoColumnBlockProps {
  props: Record<string, unknown>;
}

const LEFT_WIDTH_MAP: Record<string, { left: string; right: string }> = {
  "1/3": { left: "md:col-span-4", right: "md:col-span-8" },
  "1/2": { left: "md:col-span-6", right: "md:col-span-6" },
  "2/3": { left: "md:col-span-8", right: "md:col-span-4" },
};

export function TwoColumnBlock({ props }: TwoColumnBlockProps) {
  const leftContent = (props.leftContent as string) ?? "";
  const rightContent = (props.rightContent as string) ?? "";
  const leftWidth = (props.leftWidth as string) ?? "1/2";

  const widths = LEFT_WIDTH_MAP[leftWidth] ?? LEFT_WIDTH_MAP["1/2"];

  return (
    <section className="py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-12">
        <div className={`${widths.left}`}>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: leftContent }}
          />
        </div>
        <div className={`${widths.right}`}>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: rightContent }}
          />
        </div>
      </div>
    </section>
  );
}

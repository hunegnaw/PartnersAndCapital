import { BLOCK_MAP } from "./block-renderer";
import type { SubBlockData } from "@/lib/page-blocks";

interface TwoColumnBlockProps {
  props: Record<string, unknown>;
}

const LEFT_WIDTH_MAP: Record<string, { left: string; right: string }> = {
  "1/3": { left: "md:col-span-4", right: "md:col-span-8" },
  "1/2": { left: "md:col-span-6", right: "md:col-span-6" },
  "2/3": { left: "md:col-span-8", right: "md:col-span-4" },
};

function renderColumn(
  blocks: SubBlockData[] | undefined,
  htmlContent: string
) {
  if (blocks && blocks.length > 0) {
    return (
      <>
        {[...blocks]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((block) => {
            const Component = BLOCK_MAP[block.type];
            if (!Component) return null;
            return <Component key={block.id} props={block.props} />;
          })}
      </>
    );
  }

  if (htmlContent) {
    return (
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return null;
}

export function TwoColumnBlock({ props }: TwoColumnBlockProps) {
  const leftContent = (props.leftContent as string) ?? "";
  const rightContent = (props.rightContent as string) ?? "";
  const leftWidth = (props.leftWidth as string) ?? "1/2";
  const leftBlocks = (props.leftBlocks as SubBlockData[] | undefined) ?? [];
  const rightBlocks = (props.rightBlocks as SubBlockData[] | undefined) ?? [];

  const widths = LEFT_WIDTH_MAP[leftWidth] ?? LEFT_WIDTH_MAP["1/2"];

  return (
    <section className="py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-12">
        <div className={`${widths.left}`}>
          {renderColumn(leftBlocks, leftContent)}
        </div>
        <div className={`${widths.right}`}>
          {renderColumn(rightBlocks, rightContent)}
        </div>
      </div>
    </section>
  );
}

import { resolveBlockFont } from "@/lib/block-fonts";

interface ImageBlockProps {
  props: Record<string, unknown>;
}

export function ImageBlock({ props }: ImageBlockProps) {
  const src = (props.imageUrl as string) ?? (props.src as string) ?? "";
  const alt = (props.alt as string) ?? "";
  const caption = (props.caption as string) ?? "";
  const captionColor = (props.captionColor as string) || "#6b7280";
  const maxWidth = (props.maxWidth as string) ?? "md";

  const maxWidthMap: Record<string, string> = {
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

  const maxWidthClass = maxWidthMap[maxWidth] ?? "max-w-5xl";

  const captionFont = resolveBlockFont((props.captionFont as string) || "");

  if (!src) return null;

  return (
    <section className="py-12">
      <div className={`mx-auto px-6 ${maxWidthClass}`}>
        <figure className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="mx-auto h-auto w-full rounded-lg"
          />
          {caption && (
            <figcaption
              className="mt-3 text-sm"
              style={{ color: captionColor, ...(captionFont ?? {}) }}
            >
              {caption}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}

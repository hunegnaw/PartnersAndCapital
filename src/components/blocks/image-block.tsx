interface ImageBlockProps {
  props: Record<string, unknown>;
}

export function ImageBlock({ props }: ImageBlockProps) {
  const src = (props.src as string) ?? "";
  const alt = (props.alt as string) ?? "";
  const caption = (props.caption as string) ?? "";
  const maxWidth = (props.maxWidth as string) ?? "4xl";

  const maxWidthMap: Record<string, string> = {
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    full: "max-w-full",
  };

  const maxWidthClass = maxWidthMap[maxWidth] ?? "max-w-4xl";

  if (!src) return null;

  return (
    <section className="py-12">
      <div className={`mx-auto px-6 ${maxWidthClass}`}>
        <figure className="text-center">
          <img
            src={src}
            alt={alt}
            className="mx-auto h-auto w-full rounded-lg"
          />
          {caption && (
            <figcaption className="mt-3 text-sm text-gray-500">
              {caption}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}

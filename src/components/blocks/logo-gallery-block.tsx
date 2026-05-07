interface Logo {
  imageUrl: string;
  alt: string;
  url?: string;
}

interface LogoGalleryBlockProps {
  props: Record<string, unknown>;
}

const COLUMNS_MAP: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-5",
  6: "grid-cols-3 md:grid-cols-6",
};

export function LogoGalleryBlock({ props }: LogoGalleryBlockProps) {
  const heading = (props.heading as string) ?? "";
  const logos = (props.logos as Logo[]) ?? [];
  const columns = (props.columns as number) ?? 4;
  const grayscale = (props.grayscale as boolean) ?? false;

  const columnsClass = COLUMNS_MAP[columns] ?? "grid-cols-2 md:grid-cols-4";

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-16">
        {heading && (
          <h2
            className="mb-14 text-center leading-[1.15]"
            style={{
              fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
              fontWeight: "var(--font-section-heading-weight, 300)" as unknown as number,
              fontSize: "clamp(32px, 4vw, 52px)",
              color: "var(--font-section-heading-color, #1A2640)",
            }}
            dangerouslySetInnerHTML={{ __html: heading }}
          />
        )}
        <div
          className={`grid ${columnsClass} items-center gap-8`}
        >
          {logos.filter((l) => l.imageUrl).map((logo, index) => {
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.imageUrl}
                alt={logo.alt}
                className={`mx-auto h-16 w-auto object-contain ${
                  grayscale
                    ? "grayscale transition hover:grayscale-0"
                    : ""
                }`}
              />
            );

            return logo.url ? (
              <a
                key={index}
                href={logo.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {img}
              </a>
            ) : (
              <div key={index}>{img}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

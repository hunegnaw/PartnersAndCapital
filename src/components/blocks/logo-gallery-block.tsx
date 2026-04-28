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
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        {heading && (
          <h2 className="mb-12 text-center text-3xl font-bold text-[#0f1c2e]">
            {heading}
          </h2>
        )}
        <div
          className={`grid ${columnsClass} items-center gap-8`}
        >
          {logos.map((logo, index) => {
            const img = (
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

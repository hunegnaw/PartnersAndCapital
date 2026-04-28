interface EmbedBlockProps {
  props: Record<string, unknown>;
}

function toEmbedUrl(url: string): string {
  // YouTube: convert watch URLs and short URLs to embed
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  // Vimeo: convert standard URLs to embed
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Already an embed URL or unknown provider — return as-is
  return url;
}

export function EmbedBlock({ props }: EmbedBlockProps) {
  const url = (props.url as string) ?? "";
  const title = (props.title as string) ?? "Embedded content";
  const aspectRatio = (props.aspectRatio as string) ?? "16/9";

  if (!url) return null;

  const embedUrl = toEmbedUrl(url);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div
          className="relative w-full overflow-hidden rounded-lg"
          style={{ aspectRatio }}
        >
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </section>
  );
}

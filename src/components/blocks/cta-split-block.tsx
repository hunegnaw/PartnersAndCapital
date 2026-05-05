"use client";

import { parseHeading } from "@/lib/parse-heading";

interface CtaSplitBlockProps {
  props: Record<string, unknown>;
}

function parseBulletText(text: string): React.ReactNode {
  // Convert **bold** to <strong> elements
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function CtaSplitBlock({ props }: CtaSplitBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const description = (props.description as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const ctaText2 = (props.ctaText2 as string) ?? "";
  const ctaUrl2 = (props.ctaUrl2 as string) ?? "";
  const bullets = (props.bullets as { text: string }[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";

  return (
    <section style={{ backgroundColor }} className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — CTA content */}
          <div>
            {tagline && (
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="inline-block h-px w-8"
                  style={{ backgroundColor: "#B07D3A" }}
                />
                <span
                  className="text-xs font-medium uppercase tracking-[0.2em]"
                  style={{ color: "#B07D3A" }}
                >
                  {tagline}
                </span>
              </div>
            )}
            {heading && (
              <h2
                className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl"
                style={{ color: "#1A2640" }}
              >
                {parseHeading(heading)}
              </h2>
            )}
            {description && (
              <p className="mt-6 text-lg leading-relaxed text-gray-600">
                {description}
              </p>
            )}
            {(ctaText || ctaText2) && (
              <div className="mt-10 flex flex-wrap gap-4">
                {ctaText && ctaUrl && (
                  <a
                    href={ctaUrl}
                    className="inline-block rounded-sm px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:brightness-110"
                    style={{ backgroundColor: "#B07D3A" }}
                  >
                    {ctaText}
                  </a>
                )}
                {ctaText2 && ctaUrl2 && (
                  <a
                    href={ctaUrl2}
                    className="inline-block rounded-sm border px-8 py-3 text-sm font-semibold uppercase tracking-wider transition hover:bg-gray-100"
                    style={{
                      borderColor: "#1A2640",
                      color: "#1A2640",
                    }}
                  >
                    {ctaText2}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right — bullet list */}
          {bullets.length > 0 && (
            <div
              className="border-l-2 pl-8 lg:pl-12"
              style={{ borderColor: "#E8D5B0" }}
            >
              <ul className="space-y-5">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: "#B07D3A" }}
                    />
                    <span className="text-base leading-relaxed text-gray-700">
                      {parseBulletText(bullet.text)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

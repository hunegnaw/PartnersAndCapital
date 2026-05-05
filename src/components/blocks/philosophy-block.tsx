"use client";

import { parseHeading } from "@/lib/parse-heading";

interface PhilosophyBlockProps {
  props: Record<string, unknown>;
}

export function PhilosophyBlock({ props }: PhilosophyBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const quote = (props.quote as string) ?? "";
  const attribution = (props.attribution as string) ?? "";
  const pillars =
    (props.pillars as { name: string; description: string }[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) || "#1A2640";
  const textColor = (props.textColor as string) || "#ffffff";

  return (
    <section
      className="relative py-20 md:py-28"
      style={{
        backgroundColor,
        color: textColor,
        backgroundImage:
          "radial-gradient(ellipse at 30% 50%, rgba(176,125,58,0.06) 0%, transparent 60%)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
          {/* Left — quote */}
          <div>
            {tagline && (
              <div className="mb-6 flex items-center gap-3">
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
            {quote && (
              <blockquote
                className="text-2xl leading-relaxed italic md:text-3xl lg:text-4xl"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                &ldquo;{parseHeading(quote)}&rdquo;
              </blockquote>
            )}
            {attribution && (
              <div className="mt-8 flex items-center gap-3">
                <span
                  className="inline-block h-px w-8"
                  style={{ backgroundColor: "#B07D3A" }}
                />
                <span
                  className="text-sm font-medium tracking-wide"
                  style={{ color: "#E8D5B0" }}
                >
                  {attribution}
                </span>
              </div>
            )}
          </div>

          {/* Right — pillars */}
          {pillars.length > 0 && (
            <div className="space-y-8">
              {pillars.map((pillar, i) => (
                <div
                  key={i}
                  className="border-l-2 pl-6"
                  style={{ borderColor: "#B07D3A" }}
                >
                  <h3
                    className="mb-2 text-lg font-semibold"
                    style={{ color: "#E8D5B0" }}
                  >
                    {pillar.name}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

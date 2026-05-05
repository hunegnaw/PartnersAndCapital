"use client";

import { useState } from "react";
import { parseHeading } from "@/lib/parse-heading";

interface AssetCardsBlockProps {
  props: Record<string, unknown>;
}

export function AssetCardsBlock({ props }: AssetCardsBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const subtitle = (props.subtitle as string) ?? "";
  const cards =
    (props.cards as { name: string; description: string }[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";

  return (
    <section style={{ backgroundColor }} className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-16">
        {/* Header */}
        <div className="mb-16 max-w-2xl">
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
          {subtitle && (
            <p className="mt-4 text-lg text-gray-600">{subtitle}</p>
          )}
        </div>

        {/* Cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => (
            <AssetCard key={i} card={card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AssetCard({
  card,
  index,
}: {
  card: { name: string; description: string };
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative cursor-default rounded-lg border p-8 transition-all duration-300"
      style={{
        backgroundColor: hovered ? "#1A2640" : "#ffffff",
        borderColor: hovered ? "#1A2640" : "#dfdedd",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Number */}
      <div
        className="mb-4 text-sm font-medium transition-colors duration-300"
        style={{ color: hovered ? "#E8D5B0" : "#B07D3A" }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Gold line */}
      <div
        className="mb-6 h-px w-10 transition-colors duration-300"
        style={{ backgroundColor: "#B07D3A" }}
      />

      {/* Name */}
      <h3
        className="mb-3 text-lg font-semibold transition-colors duration-300"
        style={{ color: hovered ? "#ffffff" : "#1A2640" }}
      >
        {card.name}
      </h3>

      {/* Description */}
      <p
        className="mb-6 text-sm leading-relaxed transition-colors duration-300"
        style={{ color: hovered ? "rgba(255,255,255,0.7)" : "#5f5e5a" }}
      >
        {card.description}
      </p>

      {/* Explore link */}
      <div
        className="text-sm font-medium transition-colors duration-300"
        style={{ color: hovered ? "#E8D5B0" : "#B07D3A" }}
      >
        Explore &rarr;
      </div>
    </div>
  );
}

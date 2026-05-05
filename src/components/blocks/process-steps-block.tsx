"use client";

import { useEffect, useState } from "react";
import { parseHeading } from "@/lib/parse-heading";

interface ProcessStepsBlockProps {
  props: Record<string, unknown>;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function ProcessStepsBlock({ props }: ProcessStepsBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const steps =
    (props.steps as { name: string; description: string }[]) ?? [];
  const sidebarTagline = (props.sidebarTagline as string) ?? "";
  const sidebarStat = (props.sidebarStat as string) ?? "";
  const sidebarLabel = (props.sidebarLabel as string) ?? "";
  const sidebarQuote = (props.sidebarQuote as string) ?? "";
  const showDynamicStats = !!props.showDynamicStats;

  const [dynamicStat, setDynamicStat] = useState<string | null>(null);

  useEffect(() => {
    if (!showDynamicStats) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setDynamicStat(data.avgNetReturn))
      .catch(() => {});
  }, [showDynamicStats]);

  const displayStat = showDynamicStats && dynamicStat ? dynamicStat : sidebarStat;

  return (
    <section className="py-20 md:py-28">
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
        </div>

        <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
          {/* Steps — left 2 columns */}
          <div className="lg:col-span-2">
            <div className="divide-y divide-gray-200">
              {steps.map((step, i) => (
                <div key={i} className="py-8 first:pt-0 last:pb-0">
                  <div className="flex gap-6">
                    <span
                      className="shrink-0 text-sm font-medium"
                      style={{ color: "#B07D3A" }}
                    >
                      {ROMAN_NUMERALS[i] ?? `${i + 1}`}.
                    </span>
                    <div>
                      <h3
                        className="mb-2 text-lg font-semibold"
                        style={{ color: "#1A2640" }}
                      >
                        {step.name}
                      </h3>
                      <p className="text-sm leading-relaxed text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar card — right column */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div
              className="rounded-lg p-8"
              style={{ backgroundColor: "#1A2640" }}
            >
              {sidebarTagline && (
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="inline-block h-px w-6"
                    style={{ backgroundColor: "#B07D3A" }}
                  />
                  <span
                    className="text-xs font-medium uppercase tracking-[0.2em]"
                    style={{ color: "#B07D3A" }}
                  >
                    {sidebarTagline}
                  </span>
                </div>
              )}
              {displayStat && (
                <div
                  className="text-5xl font-bold"
                  style={{ color: "#E8D5B0" }}
                >
                  {displayStat}
                </div>
              )}
              {sidebarLabel && (
                <div className="mt-2 text-sm text-white/50">{sidebarLabel}</div>
              )}
              {sidebarQuote && (
                <p
                  className="mt-6 border-t border-white/10 pt-6 text-sm italic leading-relaxed"
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  &ldquo;{sidebarQuote}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

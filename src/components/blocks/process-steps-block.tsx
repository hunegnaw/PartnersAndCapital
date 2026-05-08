"use client";

import { useEffect, useState } from "react";
import { resolveBlockFont } from "@/lib/block-fonts";

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
  const backgroundColor = (props.backgroundColor as string) || "#ffffff";
  const headingColor = (props.headingColor as string) || "";
  const stepNameColor = (props.stepNameColor as string) || "#1A2640";
  const stepDescColor = (props.stepDescColor as string) || "#888780";
  const sidebarBgColor = (props.sidebarBgColor as string) || "#1A2640";
  const taglineColor = (props.taglineColor as string) || "";
  const sidebarTaglineColor = (props.sidebarTaglineColor as string) || "";
  const sidebarStatColor = (props.sidebarStatColor as string) || "#E8D5B0";
  const sidebarLabelColor = (props.sidebarLabelColor as string) || "";
  const sidebarQuoteColor = (props.sidebarQuoteColor as string) || "";
  const maxWidth = (props.maxWidth as string) ?? "xl";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  const headingFont = resolveBlockFont((props.headingFont as string) || "");
  const stepNameFont = resolveBlockFont((props.stepNameFont as string) || "");
  const stepDescFont = resolveBlockFont((props.stepDescFont as string) || "");
  const taglineFont = resolveBlockFont((props.taglineFont as string) || "");
  const sidebarStatFont = resolveBlockFont((props.sidebarStatFont as string) || "");
  const sidebarTaglineFont = resolveBlockFont((props.sidebarTaglineFont as string) || "");
  const sidebarLabelFont = resolveBlockFont((props.sidebarLabelFont as string) || "");
  const sidebarQuoteFont = resolveBlockFont((props.sidebarQuoteFont as string) || "");

  return (
    <section className="py-24 md:py-28" style={{ backgroundColor }}>
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-7xl"} px-6 md:px-12 lg:px-16`}>
        {/* Header */}
        <div className="mb-14">
          {tagline && (
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-block h-px w-6"
                style={{ backgroundColor: taglineColor || "var(--font-section-tag-color, #B07D3A)" }}
              />
              <span
                className="uppercase tracking-[0.18em]"
                style={{
                  fontFamily: "var(--font-section-tag-family, Inter), sans-serif",
                  fontSize: "var(--font-section-tag-size, 10px)",
                  fontWeight: "var(--font-section-tag-weight, 400)" as unknown as number,
                  color: taglineColor || "var(--font-section-tag-color, #B07D3A)",
                  ...(taglineFont ?? {}),
                }}
              >
                {tagline}
              </span>
            </div>
          )}
          {heading && (
            <h2
              className="heading-light leading-[1.15]"
              style={{
                color: headingColor || undefined,
                ...(headingFont ?? {}),
              }}
              dangerouslySetInnerHTML={{ __html: heading }}
            />
          )}
        </div>

        <div className="grid gap-16 lg:grid-cols-[1fr_1fr] lg:gap-20">
          {/* Steps — left */}
          <div>
            {steps.map((step, i) => (
              <div
                key={i}
                className="flex gap-6 py-6 first:pt-0"
                style={{ borderBottom: "0.5px solid rgba(26,38,64,0.1)" }}
              >
                <span
                  className="shrink-0 pt-0.5"
                  style={{
                    fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                    fontSize: "13px",
                    fontWeight: 400,
                    color: "#B07D3A",
                  }}
                >
                  {ROMAN_NUMERALS[i] ?? `${i + 1}`}.
                </span>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                      fontSize: "20px",
                      fontWeight: 500,
                      color: stepNameColor,
                      ...(stepNameFont ?? {}),
                    }}
                  >
                    {step.name}
                  </h3>
                  <p
                    className="leading-[1.7]"
                    style={{
                      fontFamily: "var(--font-body-family, Inter), sans-serif",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: stepDescColor,
                      ...(stepDescFont ?? {}),
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar card — right */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="p-10" style={{ backgroundColor: sidebarBgColor }}>
              {sidebarTagline && (
                <div
                  className="mb-5 uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: "var(--font-section-tag-family, Inter), sans-serif",
                    fontSize: "10px",
                    fontWeight: "var(--font-section-tag-weight, 400)" as unknown as number,
                    color: sidebarTaglineColor || "#B07D3A",
                    ...(sidebarTaglineFont ?? {}),
                  }}
                >
                  {sidebarTagline}
                </div>
              )}
              {displayStat && (
                <div
                  className="leading-none"
                  style={{
                    fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                    fontSize: "64px",
                    fontWeight: 300,
                    color: sidebarStatColor,
                    ...(sidebarStatFont ?? {}),
                  }}
                >
                  {displayStat}
                </div>
              )}
              {sidebarLabel && (
                <div
                  className="mt-2 tracking-[0.08em]"
                  style={{
                    fontFamily: "var(--font-body-family, Inter), sans-serif",
                    fontSize: "11px",
                    fontWeight: 300,
                    color: sidebarLabelColor || "rgba(255,255,255,0.4)",
                    ...(sidebarLabelFont ?? {}),
                  }}
                >
                  {sidebarLabel}
                </div>
              )}
              {sidebarQuote && (
                <p
                  className="mt-8 border-t border-white/10 pt-8 leading-[1.5]"
                  style={{
                    fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                    fontSize: "20px",
                    fontWeight: 300,
                    fontStyle: "italic",
                    color: sidebarQuoteColor || "rgba(232,213,176,0.8)",
                    ...(sidebarQuoteFont ?? {}),
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

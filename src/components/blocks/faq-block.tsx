"use client";

import { useState } from "react";
import { resolveBlockFont } from "@/lib/block-fonts";

interface FaqBlockProps {
  props: Record<string, unknown>;
}

export function FaqBlock({ props }: FaqBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const items =
    (props.items as { question: string; answer: string }[]) ?? [];
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";
  const taglineColor = (props.taglineColor as string) || "";
  const headingColor = (props.headingColor as string) || "";
  const questionColor = (props.questionColor as string) || "#1A2640";
  const answerColor = (props.answerColor as string) || "#888780";
  const maxWidth = (props.maxWidth as string) ?? "xl";
  const MAX_WIDTH: Record<string, string> = {
    sm: "max-w-4xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  };

  const taglineFont = resolveBlockFont((props.taglineFont as string) || "");
  const headingFont = resolveBlockFont((props.headingFont as string) || "");
  const questionFont = resolveBlockFont((props.questionFont as string) || "");
  const answerFont = resolveBlockFont((props.answerFont as string) || "");

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <section className="py-24 md:py-28" style={{ backgroundColor }}>
      <div
        className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-7xl"} px-6 md:px-12 lg:px-16`}
      >
        {/* Header */}
        <div className="mb-14">
          {tagline && (
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-block h-px w-6"
                style={{
                  backgroundColor:
                    taglineColor ||
                    "var(--font-section-tag-color, #B07D3A)",
                }}
              />
              <span
                className="uppercase tracking-[0.18em]"
                style={{
                  fontFamily:
                    "var(--font-section-tag-family, Inter), sans-serif",
                  fontSize: "var(--font-section-tag-size, 10px)",
                  fontWeight:
                    "var(--font-section-tag-weight, 400)" as unknown as number,
                  color:
                    taglineColor ||
                    "var(--font-section-tag-color, #B07D3A)",
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
                fontFamily:
                  "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                fontWeight:
                  "var(--font-section-heading-weight, 300)" as unknown as number,
                fontStyle: "var(--font-section-heading-style, normal)",
                color:
                  headingColor ||
                  "var(--font-section-heading-color, #1A2640)",
                fontSize: "clamp(32px, 4vw, 52px)",
                ...(headingFont ?? {}),
              }}
              dangerouslySetInnerHTML={{ __html: heading }}
            />
          )}
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                style={{
                  borderBottom: "0.5px solid rgba(26,38,64,0.1)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between py-6 text-left"
                >
                  <span
                    style={{
                      fontFamily:
                        "var(--font-body-family, Inter), sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: questionColor,
                      ...(questionFont ?? {}),
                    }}
                  >
                    {item.question}
                  </span>
                  <span
                    className="ml-4 shrink-0 text-lg leading-none select-none"
                    style={{ color: questionColor, opacity: 0.5 }}
                  >
                    {isOpen ? "\u2212" : "+"}
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: isOpen ? "500px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="pb-6">
                    <p
                      className="leading-[1.7]"
                      style={{
                        fontFamily:
                          "var(--font-body-family, Inter), sans-serif",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: answerColor,
                        ...(answerFont ?? {}),
                      }}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

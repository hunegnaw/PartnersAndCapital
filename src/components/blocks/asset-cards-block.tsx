"use client";

import { useState } from "react";
import { resolveBlockFont, resolveBlockFontVars } from "@/lib/block-fonts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssetCard {
  name: string;
  description: string;
  modalContent?: string;
}

interface AssetCardsBlockProps {
  props: Record<string, unknown>;
}

export function AssetCardsBlock({ props }: AssetCardsBlockProps) {
  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const subtitle = (props.subtitle as string) ?? "";
  const cards = (props.cards as AssetCard[]) ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openCard = openIndex !== null ? cards[openIndex] : null;
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";
  const taglineColor = (props.taglineColor as string) || "";
  const headingColor = (props.headingColor as string) || "";
  const subtitleColor = (props.subtitleColor as string) || "";
  const maxWidth = (props.maxWidth as string) ?? "xl";

  const maxWidthClass: Record<string, string> = {
    sm: "max-w-4xl",
    md: "max-w-5xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
    // legacy keys
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  };

  const cardNameColor = (props.cardNameColor as string) || "";
  const cardDescColor = (props.cardDescColor as string) || "";

  const taglineFont = resolveBlockFont((props.taglineFont as string) || "");
  const headingFont = resolveBlockFontVars((props.headingFont as string) || "", "h2");
  const subtitleFont = resolveBlockFont((props.subtitleFont as string) || "");
  const cardNameFont = resolveBlockFontVars((props.cardNameFont as string) || "", "h3");
  const cardDescFont = resolveBlockFont((props.cardDescFont as string) || "");

  return (
    <section style={{ backgroundColor }} className="py-24 md:py-28">
      <div className={`mx-auto ${maxWidthClass[maxWidth] ?? "max-w-7xl"} px-16`}>
        {/* Header */}
        <div className="mb-14">
          {tagline && (
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-block h-px w-6"
                style={{ backgroundColor: "var(--font-section-tag-color, #B07D3A)" }}
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
          {subtitle && (
            <p
              className="mt-2 leading-relaxed"
              style={{
                fontFamily: "var(--font-subtitle-family, 'Cormorant Garamond'), serif",
                fontWeight: "var(--font-subtitle-weight, 300)" as unknown as number,
                fontStyle: "var(--font-subtitle-style, italic)",
                fontSize: "var(--font-subtitle-size, 18px)",
                color: subtitleColor || "var(--font-subtitle-color, #888780)",
                ...(subtitleFont ?? {}),
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Cards grid — 1px gap like mockup */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ gap: "1px", backgroundColor: "rgba(26,38,64,0.1)" }}
        >
          {cards.map((card, i) => (
            <AssetCard
              key={i}
              card={card}
              index={i}
              cardNameColor={cardNameColor}
              cardDescColor={cardDescColor}
              cardNameFont={cardNameFont}
              cardDescFont={cardDescFont}
              onOpen={card.modalContent ? () => setOpenIndex(i) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Modal content popup */}
      <Dialog open={openCard !== null} onOpenChange={(o) => { if (!o) setOpenIndex(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {openCard && (
            <>
              <DialogHeader>
                <DialogTitle
                  style={{
                    fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
                    fontWeight: 500,
                    fontSize: "28px",
                    color: "#1A2640",
                  }}
                >
                  {openCard.name}
                </DialogTitle>
              </DialogHeader>
              <div
                className="prose prose-lg max-w-none prose-headings:text-[#1A2640] prose-a:text-[#B07D3A] prose-strong:text-[#1A2640]"
                dangerouslySetInnerHTML={{ __html: openCard.modalContent || "" }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AssetCard({
  card,
  index,
  cardNameColor,
  cardDescColor,
  cardNameFont,
  cardDescFont,
  onOpen,
}: {
  card: AssetCard;
  index: number;
  cardNameColor: string;
  cardDescColor: string;
  cardNameFont: import("react").CSSProperties | null;
  cardDescFont: import("react").CSSProperties | null;
  onOpen?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={`relative overflow-hidden px-7 py-9 transition-all duration-300 ${
        onOpen ? "cursor-pointer" : "cursor-default"
      }`}
      style={{
        backgroundColor: hovered ? "#1A2640" : "#ffffff",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Large background number */}
      <div
        className="pointer-events-none absolute right-5 top-4 leading-none transition-colors duration-300"
        style={{
          fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
          fontSize: "72px",
          fontWeight: 300,
          color: hovered ? "rgba(232,213,176,0.2)" : "rgba(26,38,64,0.06)",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Gold accent line */}
      <div
        className="mb-5 h-px w-8"
        style={{ backgroundColor: "#B07D3A" }}
      />

      {/* Card name */}
      <h3
        className="mb-3 transition-colors duration-300"
        style={{
          fontFamily: "var(--font-section-heading-family, 'Cormorant Garamond'), serif",
          fontSize: "22px",
          fontWeight: 500,
          color: hovered ? "#E8D5B0" : (cardNameColor || "#1A2640"),
          ...(cardNameFont ?? {}),
        }}
      >
        {card.name}
      </h3>

      {/* Description */}
      <p
        className="mb-5 leading-[1.7] transition-colors duration-300"
        style={{
          fontFamily: "var(--font-body-family, Inter), sans-serif",
          fontSize: "12px",
          fontWeight: 300,
          color: hovered ? "rgba(255,255,255,0.55)" : (cardDescColor || "#888780"),
          ...(cardDescFont ?? {}),
        }}
      >
        {card.description}
      </p>

      {/* Explore link */}
      <span
        className="tracking-[0.1em] transition-colors duration-300"
        style={{
          fontFamily: "var(--font-body-family, Inter), sans-serif",
          fontSize: "11px",
          color: hovered ? "#E8D5B0" : "#B07D3A",
        }}
      >
        Explore &rarr;
      </span>
    </div>
  );
}

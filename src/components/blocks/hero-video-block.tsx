"use client";

import { useRef, useEffect, useState } from "react";

interface HeroVideoBlockProps {
  props: Record<string, unknown>;
}

interface StatsData {
  totalDeployed: string;
  avgNetReturn: string;
  assetClassCount: number;
}

export function HeroVideoBlock({ props }: HeroVideoBlockProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stats, setStats] = useState<StatsData | null>(null);

  const tagline = (props.tagline as string) ?? "";
  const heading = (props.heading as string) ?? "";
  const subheading = (props.subheading as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const ctaText2 = (props.ctaText2 as string) ?? "";
  const ctaUrl2 = (props.ctaUrl2 as string) ?? "";
  const videoUrl = (props.videoUrl as string) ?? "";
  const posterImageUrl = (props.posterImageUrl as string) ?? "";
  const overlayOpacity = (props.overlayOpacity as number) ?? 0.5;
  const showStats = props.showStats !== false;
  const scrollHintText = (props.scrollHintText as string) ?? "Scroll";

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!showStats) return;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, [showStats]);

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden">
      {/* Background radial gradients */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 50%, rgba(176,125,58,0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(44,62,92,0.6) 0%, transparent 50%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(232,213,176,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,213,176,0.03) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Video background */}
      {videoUrl ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster={posterImageUrl || undefined}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 bg-[#1A2640]" />
      )}

      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: overlayOpacity }}
      />

      {/* Content — left-aligned */}
      <div className="relative z-10 w-full px-6 pb-16 pt-40 md:px-12 lg:px-16">
        <div className="max-w-[900px]">
          {/* Tagline */}
          {tagline && (
            <div
              className="mb-7 flex items-center gap-3"
              style={{ animation: "fadeUp 0.8s ease 0.1s both" }}
            >
              <span
                className="inline-block h-px w-8"
                style={{ backgroundColor: "var(--font-section-tag-color, #B07D3A)" }}
              />
              <span
                className="uppercase tracking-[0.2em]"
                style={{
                  fontFamily: "var(--font-section-tag-family, Inter), sans-serif",
                  fontSize: "var(--font-section-tag-size, 10px)",
                  fontWeight: "var(--font-section-tag-weight, 400)" as unknown as number,
                  color: "var(--font-section-tag-color, #B07D3A)",
                }}
              >
                {tagline}
              </span>
            </div>
          )}

          {/* Heading */}
          {heading && (
            <h1
              className="heading-dark leading-[1.05] tracking-tight text-white"
              style={{
                fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                fontWeight: "var(--font-hero-title-weight, 300)" as unknown as number,
                fontStyle: "var(--font-hero-title-style, normal)",
                fontSize: "clamp(48px, 7vw, 88px)",
                animation: "fadeUp 0.8s ease 0.25s both",
              }}
              dangerouslySetInnerHTML={{ __html: heading }}
            />
          )}

          {/* Subtitle */}
          {subheading && (
            <p
              className="subtitle-font mt-6 max-w-[600px]"
              style={{
                fontFamily: "var(--font-subtitle-family, 'Cormorant Garamond'), serif",
                fontWeight: "var(--font-subtitle-weight, 300)" as unknown as number,
                fontStyle: "var(--font-subtitle-style, italic)",
                fontSize: "clamp(16px, 2vw, 22px)",
                lineHeight: 1.6,
                color: "rgba(232,213,176,0.65)",
                animation: "fadeUp 0.8s ease 0.4s both",
              }}
              dangerouslySetInnerHTML={{ __html: subheading }}
            />
          )}

          {/* CTA Buttons */}
          {(ctaText || ctaText2) && (
            <div
              className="mt-10 flex flex-wrap gap-4"
              style={{ animation: "fadeUp 0.8s ease 0.55s both" }}
            >
              {ctaText && ctaUrl && (
                <a
                  href={ctaUrl}
                  className="inline-block px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.12em] transition hover:brightness-110"
                  style={{
                    fontFamily: "var(--font-body-family, Inter), sans-serif",
                    backgroundColor: "#B07D3A",
                    color: "#1A2640",
                  }}
                >
                  {ctaText}
                </a>
              )}
              {ctaText2 && ctaUrl2 && (
                <a
                  href={ctaUrl2}
                  className="inline-block px-8 py-3.5 text-[11px] font-normal uppercase tracking-[0.12em] transition hover:border-[#E8D5B0] hover:text-[#E8D5B0]"
                  style={{
                    fontFamily: "var(--font-body-family, Inter), sans-serif",
                    border: "0.5px solid rgba(232,213,176,0.4)",
                    color: "rgba(232,213,176,0.8)",
                  }}
                >
                  {ctaText2}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Stats — bottom right */}
        {showStats && stats && (
          <div
            className="absolute bottom-16 right-6 hidden flex-col gap-6 text-right md:right-12 md:flex lg:right-16"
            style={{ animation: "fadeUp 0.8s ease 0.7s both" }}
          >
            <div>
              <div
                className="leading-none"
                style={{
                  fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                  fontSize: "36px",
                  fontWeight: 300,
                  color: "#E8D5B0",
                }}
              >
                {stats.totalDeployed}
              </div>
              <div
                className="mt-1 uppercase tracking-[0.12em]"
                style={{
                  fontFamily: "var(--font-body-family, Inter), sans-serif",
                  fontSize: "10px",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                Capital Deployed
              </div>
            </div>
            <div>
              <div
                className="leading-none"
                style={{
                  fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                  fontSize: "36px",
                  fontWeight: 300,
                  color: "#E8D5B0",
                }}
              >
                {stats.avgNetReturn}
              </div>
              <div
                className="mt-1 uppercase tracking-[0.12em]"
                style={{
                  fontFamily: "var(--font-body-family, Inter), sans-serif",
                  fontSize: "10px",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                Avg Net Return
              </div>
            </div>
            <div>
              <div
                className="leading-none"
                style={{
                  fontFamily: "var(--font-hero-title-family, 'Cormorant Garamond'), serif",
                  fontSize: "36px",
                  fontWeight: 300,
                  color: "#E8D5B0",
                }}
              >
                {stats.assetClassCount}
              </div>
              <div
                className="mt-1 uppercase tracking-[0.12em]"
                style={{
                  fontFamily: "var(--font-body-family, Inter), sans-serif",
                  fontSize: "10px",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                Asset Classes
              </div>
            </div>
          </div>
        )}

        {/* Scroll hint — bottom left */}
        {scrollHintText && (
          <div className="mt-12 flex items-center gap-3">
            <span
              className="inline-block h-px w-10"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            />
            <span
              className="uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "10px",
                color: "rgba(255,255,255,0.25)",
              }}
            >
              {scrollHintText}
            </span>
          </div>
        )}
      </div>

      {/* Gold divider at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(176,125,58,0.4), transparent)",
        }}
      />
    </section>
  );
}

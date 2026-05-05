"use client";

import { useRef, useEffect, useState } from "react";
import { parseHeading } from "@/lib/parse-heading";

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
      {/* Background effects — behind video */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(176,125,58,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(26,38,64,0.12) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
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
              className="mb-6 flex items-center gap-3"
              style={{
                animation: "fadeUp 0.7s ease both",
                animationDelay: "0.1s",
              }}
            >
              <span
                className="inline-block h-px w-8"
                style={{ backgroundColor: "#B07D3A" }}
              />
              <span
                className="text-xs font-medium uppercase tracking-[0.2em]"
                style={{ color: "#E8D5B0" }}
              >
                {tagline}
              </span>
            </div>
          )}

          {/* Heading */}
          {heading && (
            <h1
              className="text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
              style={{
                animation: "fadeUp 0.7s ease both",
                animationDelay: "0.25s",
              }}
            >
              {parseHeading(heading)}
            </h1>
          )}

          {/* Subtitle */}
          {subheading && (
            <p
              className="mt-6 max-w-[600px] text-lg italic text-white/70 md:text-xl"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                animation: "fadeUp 0.7s ease both",
                animationDelay: "0.4s",
              }}
            >
              {subheading}
            </p>
          )}

          {/* CTA Buttons */}
          {(ctaText || ctaText2) && (
            <div
              className="mt-10 flex flex-wrap gap-4"
              style={{
                animation: "fadeUp 0.7s ease both",
                animationDelay: "0.55s",
              }}
            >
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
                  className="inline-block rounded-sm border px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
                  style={{ borderColor: "rgba(255,255,255,0.3)" }}
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
            className="absolute bottom-16 right-6 hidden text-right md:right-12 md:block lg:right-16"
            style={{
              animation: "fadeUp 0.7s ease both",
              animationDelay: "0.7s",
            }}
          >
            <div className="space-y-6">
              <div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: "#E8D5B0" }}
                >
                  {stats.totalDeployed}
                </div>
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Capital Deployed
                </div>
              </div>
              <div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: "#E8D5B0" }}
                >
                  {stats.avgNetReturn}
                </div>
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Avg Net Return
                </div>
              </div>
              <div>
                <div
                  className="text-3xl font-bold"
                  style={{ color: "#E8D5B0" }}
                >
                  {stats.assetClassCount}
                </div>
                <div className="text-xs uppercase tracking-wider text-white/50">
                  Asset Classes
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scroll hint — bottom left */}
        {scrollHintText && (
          <div className="mt-12 flex items-center gap-3">
            <span
              className="inline-block h-px w-10"
              style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
            />
            <span className="text-xs uppercase tracking-[0.15em] text-white/40">
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
            "linear-gradient(to right, transparent, #B07D3A, transparent)",
        }}
      />
    </section>
  );
}

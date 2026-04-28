"use client";

import { useRef, useEffect } from "react";

interface HeroVideoBlockProps {
  props: Record<string, unknown>;
}

export function HeroVideoBlock({ props }: HeroVideoBlockProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const heading = (props.heading as string) ?? "";
  const subheading = (props.subheading as string) ?? "";
  const ctaText = (props.ctaText as string) ?? "";
  const ctaUrl = (props.ctaUrl as string) ?? "";
  const videoUrl = (props.videoUrl as string) ?? "";
  const posterImageUrl = (props.posterImageUrl as string) ?? "";
  const overlayOpacity = (props.overlayOpacity as number) ?? 0.5;

  useEffect(() => {
    // Ensure autoplay works on mount (some browsers block it without user gesture)
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked — silent fail, poster image will show
      });
    }
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {heading && (
          <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl">
            {heading}
          </h1>
        )}
        {subheading && (
          <p className="mt-6 text-xl text-white/80">{subheading}</p>
        )}
        {ctaText && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-8 inline-block rounded-full bg-[#B07D3A] px-8 py-3 text-lg font-semibold text-white transition hover:bg-[#7A5520]"
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

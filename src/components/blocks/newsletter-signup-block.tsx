"use client";

import { useState, type FormEvent } from "react";
import { resolveBlockFont, resolveBlockFontVars } from "@/lib/block-fonts";

interface NewsletterSignupBlockProps {
  props: Record<string, unknown>;
}

export function NewsletterSignupBlock({ props }: NewsletterSignupBlockProps) {
  const heading = (props.heading as string) ?? "Stay Updated";
  const description = (props.description as string) ?? "";
  const backgroundColor = (props.backgroundColor as string) ?? "#1A2640";
  const headingColor = (props.headingColor as string) || "#ffffff";
  const descriptionColor = (props.descriptionColor as string) || "#ffffff99";
  const buttonColor = (props.buttonColor as string) || "#B07D3A";
  const buttonTextColor = (props.buttonTextColor as string) || "#1A2640";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const body = { email: formData.get("email") as string };

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  }

  const maxWidth = (props.maxWidth as string) ?? "sm";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  const headingFont = resolveBlockFontVars((props.headingFont as string) || "", "h2");
  const descriptionFont = resolveBlockFont((props.descriptionFont as string) || "");
  const buttonFont = resolveBlockFont((props.buttonFont as string) || "");

  return (
    <section className="py-24" style={{ backgroundColor }}>
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-4xl"} px-16 text-center`}>
        {heading && (
          <h2
            className="heading-dark leading-[1.15]"
            style={{
              color: headingColor,
              ...(headingFont ?? {}),
            }}
          >
            {heading}
          </h2>
        )}
        {description && (
          <p
            className="mt-4 leading-[1.7]"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: descriptionColor,
              ...(descriptionFont ?? {}),
            }}
          >
            {description}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className="w-full border bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 outline-none transition focus:border-[#B07D3A] sm:max-w-sm"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              fontSize: "12px",
              borderColor: "rgba(255,255,255,0.15)",
            }}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full shrink-0 px-8 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              backgroundColor: buttonColor,
              color: buttonTextColor,
              ...(buttonFont ?? {}),
            }}
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        {status === "success" && (
          <p
            className="mt-4"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              fontSize: "12px",
              color: "rgba(232,213,176,0.8)",
            }}
          >
            Thank you! You have been subscribed.
          </p>
        )}
        {status === "error" && (
          <p
            className="mt-4"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              fontSize: "12px",
              color: "#fc8181",
            }}
          >
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}

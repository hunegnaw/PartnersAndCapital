"use client";

import { useState, type FormEvent } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { resolveBlockFont, resolveBlockFontVars } from "@/lib/block-fonts";

interface ContactFormBlockProps {
  props: Record<string, unknown>;
}

export function ContactFormBlock({ props }: ContactFormBlockProps) {
  const heading = (props.heading as string) ?? "Get in Touch";
  const description = (props.description as string) ?? "";
  const showAddress = (props.showAddress as boolean) ?? false;
  const showEmail = (props.showEmail as boolean) ?? false;

  const org = useOrganization();

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
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

  const headingColor = (props.headingColor as string) || "";
  const descriptionColor = (props.descriptionColor as string) || "#888780";
  const backgroundColor = (props.backgroundColor as string) || "#F5F3EE";
  const buttonColor = (props.buttonColor as string) || "#B07D3A";
  const buttonTextColor = (props.buttonTextColor as string) || "#1A2640";
  const maxWidth = (props.maxWidth as string) ?? "sm";
  const MAX_WIDTH: Record<string, string> = { sm: "max-w-4xl", md: "max-w-5xl", lg: "max-w-6xl", xl: "max-w-7xl", full: "max-w-full" };

  const headingFont = resolveBlockFontVars((props.headingFont as string) || "", "h2");
  const descriptionFont = resolveBlockFont((props.descriptionFont as string) || "");
  const buttonFont = resolveBlockFont((props.buttonFont as string) || "");

  return (
    <section className="py-24" style={{ backgroundColor }}>
      <div className={`mx-auto ${MAX_WIDTH[maxWidth] ?? "max-w-4xl"} px-16`}>
        {heading && (
          <h2
            className="leading-[1.15]"
            style={{
              color: headingColor || undefined,
              ...(headingFont ?? {}),
            }}
          >
            {heading}
          </h2>
        )}
        {description && (
          <p
            className="mt-4 leading-[1.8]"
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

        {/* Contact info */}
        {(showAddress || showEmail) && (
          <div
            className="mt-6 space-y-2"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              fontSize: "12px",
              fontWeight: 300,
              color: "#1A2640",
            }}
          >
            {showAddress && org.address && <p>{org.address}</p>}
            {showEmail && org.email && (
              <p>
                <a href={`mailto:${org.email}`} className="underline" style={{ color: "#B07D3A" }}>
                  {org.email}
                </a>
              </p>
            )}
            {showEmail && org.phone && (
              <p>
                <a href={`tel:${org.phone}`} className="underline" style={{ color: "#B07D3A" }}>
                  {org.phone}
                </a>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1.5 block uppercase tracking-[0.12em]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                color: "#1A2640",
              }}
            >
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              className="w-full border bg-white px-4 py-2.5 text-[#1A2640] outline-none transition focus:border-[#B07D3A]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "13px",
                borderColor: "rgba(26,38,64,0.15)",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="mb-1.5 block uppercase tracking-[0.12em]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                color: "#1A2640",
              }}
            >
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              className="w-full border bg-white px-4 py-2.5 text-[#1A2640] outline-none transition focus:border-[#B07D3A]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "13px",
                borderColor: "rgba(26,38,64,0.15)",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="contact-message"
              className="mb-1.5 block uppercase tracking-[0.12em]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                color: "#1A2640",
              }}
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              className="w-full border bg-white px-4 py-2.5 text-[#1A2640] outline-none transition focus:border-[#B07D3A]"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "13px",
                borderColor: "rgba(26,38,64,0.15)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.12em] transition hover:brightness-110 disabled:opacity-50"
            style={{
              fontFamily: "var(--font-body-family, Inter), sans-serif",
              backgroundColor: buttonColor,
              color: buttonTextColor,
              ...(buttonFont ?? {}),
            }}
          >
            {status === "loading" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <p
              className="text-center"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "12px",
                color: "#2d7a3a",
              }}
            >
              Thank you! Your message has been sent.
            </p>
          )}
          {status === "error" && (
            <p
              className="text-center"
              style={{
                fontFamily: "var(--font-body-family, Inter), sans-serif",
                fontSize: "12px",
                color: "#c53030",
              }}
            >
              {errorMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

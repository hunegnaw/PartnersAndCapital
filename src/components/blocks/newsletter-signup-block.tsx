"use client";

import { useState, type FormEvent } from "react";

interface NewsletterSignupBlockProps {
  props: Record<string, unknown>;
}

export function NewsletterSignupBlock({ props }: NewsletterSignupBlockProps) {
  const heading = (props.heading as string) ?? "Stay Updated";
  const description = (props.description as string) ?? "";
  const backgroundColor = (props.backgroundColor as string) ?? "#0f1c2e";

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

  return (
    <section className="py-20" style={{ backgroundColor }}>
      <div className="mx-auto max-w-2xl px-6 text-center">
        {heading && (
          <h2 className="text-3xl font-bold text-white">{heading}</h2>
        )}
        {description && (
          <p className="mt-4 text-lg text-white/80">{description}</p>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/50 outline-none transition focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/30 sm:max-w-sm"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full shrink-0 rounded-lg bg-[#b8860b] px-6 py-2.5 font-semibold text-white transition hover:bg-[#a0750a] disabled:opacity-50 sm:w-auto"
          >
            {status === "loading" ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        {status === "success" && (
          <p className="mt-4 text-green-300">
            Thank you! You have been subscribed.
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-red-300">{errorMessage}</p>
        )}
      </div>
    </section>
  );
}

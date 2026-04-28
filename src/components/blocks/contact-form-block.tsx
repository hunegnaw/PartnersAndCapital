"use client";

import { useState, type FormEvent } from "react";

interface ContactFormBlockProps {
  props: Record<string, unknown>;
}

export function ContactFormBlock({ props }: ContactFormBlockProps) {
  const heading = (props.heading as string) ?? "Get in Touch";
  const description = (props.description as string) ?? "";
  const showAddress = (props.showAddress as boolean) ?? false;
  const showEmail = (props.showEmail as boolean) ?? false;

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

  return (
    <section className="py-20 bg-[#faf8f5]">
      <div className="mx-auto max-w-2xl px-6">
        {heading && (
          <h2 className="text-3xl font-bold text-[#0f1c2e]">{heading}</h2>
        )}
        {description && (
          <p className="mt-4 text-lg text-[#0f1c2e]/70">{description}</p>
        )}

        {/* Contact info */}
        {(showAddress || showEmail) && (
          <div className="mt-6 space-y-2 text-[#0f1c2e]/80">
            {showAddress && (
              <p>605 N High St Suite 212, Columbus OH 43215</p>
            )}
            {showEmail && (
              <p>
                <a
                  href="mailto:david@partnersandcapital.com"
                  className="text-[#b8860b] underline hover:text-[#a0750a]"
                >
                  david@partnersandcapital.com
                </a>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1 block text-sm font-medium text-[#0f1c2e]"
            >
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#0f1c2e] outline-none transition focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/30"
            />
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="mb-1 block text-sm font-medium text-[#0f1c2e]"
            >
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#0f1c2e] outline-none transition focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/30"
            />
          </div>
          <div>
            <label
              htmlFor="contact-message"
              className="mb-1 block text-sm font-medium text-[#0f1c2e]"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#0f1c2e] outline-none transition focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/30"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-[#b8860b] px-6 py-3 font-semibold text-white transition hover:bg-[#a0750a] disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <p className="text-center text-green-700">
              Thank you! Your message has been sent.
            </p>
          )}
          {status === "error" && (
            <p className="text-center text-red-600">{errorMessage}</p>
          )}
        </form>
      </div>
    </section>
  );
}

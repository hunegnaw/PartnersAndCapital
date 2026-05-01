"use client";

import { useState, type FormEvent } from "react";
import { useOrganization } from "@/components/providers/organization-provider";

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

  return (
    <section className="py-20 bg-[#f5f5f3]">
      <div className="mx-auto max-w-2xl px-6">
        {heading && (
          <h2 className="text-3xl font-bold text-[#1A2640]">{heading}</h2>
        )}
        {description && (
          <p className="mt-4 text-lg text-[#1A2640]/70">{description}</p>
        )}

        {/* Contact info */}
        {(showAddress || showEmail) && (
          <div className="mt-6 space-y-2 text-[#1A2640]/80">
            {showAddress && org.address && (
              <p>{org.address}</p>
            )}
            {showEmail && org.email && (
              <p>
                <a
                  href={`mailto:${org.email}`}
                  className="text-[#B07D3A] underline hover:text-[#7A5520]"
                >
                  {org.email}
                </a>
              </p>
            )}
            {showEmail && org.phone && (
              <p>
                <a
                  href={`tel:${org.phone}`}
                  className="text-[#B07D3A] underline hover:text-[#7A5520]"
                >
                  {org.phone}
                </a>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1 block text-sm font-medium text-[#1A2640]"
            >
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#1A2640] outline-none transition focus:border-[#B07D3A] focus:ring-2 focus:ring-[#B07D3A]/30"
            />
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="mb-1 block text-sm font-medium text-[#1A2640]"
            >
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#1A2640] outline-none transition focus:border-[#B07D3A] focus:ring-2 focus:ring-[#B07D3A]/30"
            />
          </div>
          <div>
            <label
              htmlFor="contact-message"
              className="mb-1 block text-sm font-medium text-[#1A2640]"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#1A2640] outline-none transition focus:border-[#B07D3A] focus:ring-2 focus:ring-[#B07D3A]/30"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-[#B07D3A] px-6 py-3 font-semibold text-white transition hover:bg-[#7A5520] disabled:opacity-50"
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

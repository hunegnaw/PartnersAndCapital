"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import type { FooterNavColumn, FooterInvestmentLink } from "@/lib/footer";

interface InvestmentLink {
  id: string;
  label: string;
}

interface MarketingFooterProps {
  investmentLinks?: InvestmentLink[];
}

export function MarketingFooter({ investmentLinks }: MarketingFooterProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const currentYear = new Date().getFullYear();
  const org = useOrganization();
  const footer = org.footer;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }
      setStatus("success");
      setMessage("Thank you for subscribing!");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const hasInvestments = footer.modules.investments && investmentLinks && investmentLinks.length > 0;
  const navColumns: FooterNavColumn[] = footer.navColumns || [];

  // Resolve investment URLs from footer config, filtering by visibility
  const investmentLinksWithUrls = (investmentLinks || [])
    .map((il) => {
      const override = (footer.investmentLinks || []).find(
        (fl: FooterInvestmentLink) =>
          fl.investmentId === il.id || fl.assetClassId === il.id
      );
      return {
        label: il.label,
        url: override?.url || "",
        visible: override?.visible ?? true,
      };
    })
    .filter((il) => il.visible);

  // Build list of nav columns: custom columns + investments
  const middleCols = [
    ...(footer.modules.navigation ? navColumns.map((col) => ({ title: col.title, links: col.links })) : []),
    ...(hasInvestments
      ? [{ title: "Investments", links: investmentLinksWithUrls }]
      : []),
  ];

  const hasBranding = footer.modules.logo || footer.modules.tagline || footer.modules.contact;
  const hasNewsletter = footer.modules.newsletter;

  return (
    <footer
      style={{
        backgroundColor: footer.backgroundColor,
        color: footer.textColor,
        fontFamily: "var(--font-body-family, Inter), sans-serif",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-20">
        {/* Main grid: branding left, nav columns right */}
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-12 md:gap-8 lg:gap-16">
          {/* Branding column */}
          {hasBranding && (
            <div>
              {footer.modules.logo && footer.logoUrl && (
                <div className="mb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={footer.logoUrl}
                    alt={org.name}
                    className="object-contain"
                    style={{ width: "150px" }}
                  />
                </div>
              )}
              {!footer.modules.logo && (
                <p
                  className="mb-5 uppercase tracking-[0.15em]"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  {org.name}
                </p>
              )}
              {footer.modules.tagline && (
                <p
                  className="leading-relaxed"
                  style={{ fontSize: "13px", fontWeight: 300, opacity: 0.5 }}
                >
                  {footer.tagline}
                </p>
              )}
              {footer.modules.contact && (
                <div
                  className="mt-6 leading-relaxed space-y-1"
                  style={{ fontSize: "12px", fontWeight: 300, opacity: 0.35 }}
                >
                  {org.address && <p className="whitespace-pre-line">{org.address}</p>}
                  {org.email && <p>{org.email}</p>}
                  {org.phone && <p>{org.phone}</p>}
                </div>
              )}
            </div>
          )}

          {/* Navigation columns */}
          {middleCols.map((col, idx) => (
            <div key={idx}>
              <p
                className="uppercase tracking-[0.15em] mb-5"
                style={{ fontSize: "10px", fontWeight: 500, color: footer.accentColor }}
              >
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((link, i) => (
                  <li key={i}>
                    {link.url ? (
                      <Link
                        href={link.url}
                        className="transition-opacity hover:opacity-100"
                        style={{ fontSize: "12px", fontWeight: 300, opacity: 0.55 }}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span style={{ fontSize: "12px", fontWeight: 300, opacity: 0.55 }}>
                        {link.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter — full-width row below nav grid */}
        {hasNewsletter && (
          <div className="mt-16">
            <div
              className="mb-8 h-px"
              style={{
                background: `linear-gradient(90deg, ${footer.accentColor}00, ${footer.accentColor}66, ${footer.accentColor}00)`,
              }}
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div className="shrink-0">
                <p
                  className="uppercase tracking-[0.15em]"
                  style={{ fontSize: "10px", fontWeight: 500, color: footer.accentColor }}
                >
                  {footer.newsletterHeading || "Stay Updated"}
                </p>
                {footer.newsletterDescription && (
                  <p className="mt-1" style={{ fontSize: "12px", fontWeight: 300, opacity: 0.5 }}>
                    {footer.newsletterDescription}
                  </p>
                )}
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-lg">
                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "0.5px solid rgba(255,255,255,0.15)",
                    color: footer.textColor,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="px-5 py-2 text-[10px] font-medium uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: footer.accentColor,
                    color: "#1A2640",
                    fontFamily: "inherit",
                  }}
                >
                  {status === "loading" ? "..." : "Subscribe"}
                </button>
              </form>
              {status === "success" && (
                <p className="text-green-400 text-xs">{message}</p>
              )}
              {status === "error" && (
                <p className="text-red-400 text-xs">{message}</p>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        {(footer.modules.copyright || footer.modules.disclaimer || (footer.modules.legalLinks && footer.links?.length > 0)) && (
          <>
            <div
              className="mt-16 mb-8 h-px"
              style={{
                background: `linear-gradient(90deg, ${footer.accentColor}00, ${footer.accentColor}66, ${footer.accentColor}00)`,
              }}
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {footer.modules.copyright && (
                <p style={{ fontSize: "11px", fontWeight: 300, opacity: 0.4 }}>
                  &copy; {footer.copyrightStartYear}&ndash;{currentYear} {footer.copyrightEntity}. All rights reserved.
                </p>
              )}

              {footer.modules.legalLinks && footer.links?.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {footer.links.map((link: { label: string; url: string }, i: number) => (
                    link.label && link.url ? (
                      <Link
                        key={i}
                        href={link.url}
                        className="transition-opacity hover:opacity-70"
                        style={{ fontSize: "11px", fontWeight: 300, opacity: 0.4 }}
                      >
                        {link.label}
                      </Link>
                    ) : null
                  ))}
                </div>
              )}
            </div>

            {footer.modules.disclaimer && org.disclaimer && (
              <p
                className="mt-6 leading-[1.7]"
                style={{ fontSize: "10px", fontWeight: 300, opacity: 0.25 }}
              >
                {org.disclaimer}
              </p>
            )}
          </>
        )}
      </div>
    </footer>
  );
}

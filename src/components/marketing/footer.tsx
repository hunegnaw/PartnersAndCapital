"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useOrganization } from "@/components/providers/organization-provider";

interface NavLink {
  href: string;
  label: string;
}

interface MarketingFooterProps {
  navLinks?: NavLink[];
}

export function MarketingFooter({ navLinks: navLinksProp }: MarketingFooterProps) {
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

  const baseLinks = navLinksProp && navLinksProp.length > 0
    ? navLinksProp
    : [{ href: "/", label: "Home" }];
  const navLinks = [...baseLinks, { href: "/login", label: "Investor Login" }];

  // Count active top-section columns to determine grid layout
  const hasBranding = footer.modules.logo || footer.modules.tagline || footer.modules.contact;
  const hasNav = footer.modules.navigation;
  const hasNewsletter = footer.modules.newsletter;
  const colCount = [hasBranding, hasNav, hasNewsletter].filter(Boolean).length;
  const gridCols = colCount === 3 ? "md:grid-cols-3" : colCount === 2 ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <footer style={{ backgroundColor: footer.backgroundColor, color: footer.textColor }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Top section — dynamic grid */}
        {colCount > 0 && (
          <div className={`grid grid-cols-1 ${gridCols} gap-12`}>
            {/* Col: Branding / Logo / Contact */}
            {hasBranding && (
              <div>
                {footer.modules.logo && footer.logoUrl && (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={footer.logoUrl}
                      alt={org.name}
                      className="h-10 object-contain"
                    />
                  </div>
                )}
                {!footer.modules.logo && (
                  <p className="font-bold text-sm tracking-widest uppercase mb-3">
                    {org.name}
                  </p>
                )}
                {footer.modules.tagline && (
                  <p className="text-sm mb-4" style={{ opacity: 0.6 }}>
                    {footer.tagline}
                  </p>
                )}
                {footer.modules.contact && (
                  <div className="text-sm leading-relaxed space-y-1" style={{ opacity: 0.4 }}>
                    {org.address && (
                      <p className="whitespace-pre-line">{org.address}</p>
                    )}
                    {org.email && <p>{org.email}</p>}
                    {org.phone && <p>{org.phone}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Col: Navigation */}
            {hasNav && (
              <div>
                <p className="font-semibold text-sm tracking-wide uppercase mb-4">
                  Navigation
                </p>
                <ul className="space-y-2">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm transition-colors"
                        style={{ opacity: 0.6 }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Col: Newsletter */}
            {hasNewsletter && (
              <div>
                <p className="font-semibold text-sm tracking-wide uppercase mb-4">
                  Stay Updated
                </p>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 rounded px-3 py-2 text-sm focus:outline-none transition-colors"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: footer.textColor,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: footer.accentColor,
                      color: footer.textColor,
                    }}
                  >
                    {status === "loading" ? "..." : "Subscribe"}
                  </button>
                </form>
                {status === "success" && (
                  <p className="text-green-400 text-xs mt-2">{message}</p>
                )}
                {status === "error" && (
                  <p className="text-red-400 text-xs mt-2">{message}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom bar */}
        {(footer.modules.copyright || footer.modules.disclaimer) && (
          <>
            <hr className="mt-12 mb-6" style={{ borderColor: "rgba(255,255,255,0.1)" }} />

            {footer.modules.copyright && (
              <div className="text-xs" style={{ opacity: 0.4 }}>
                <p>
                  &copy; {footer.copyrightStartYear}-{currentYear} {footer.copyrightEntity}. All rights reserved.
                </p>
              </div>
            )}

            {footer.modules.disclaimer && org.disclaimer && (
              <p className="text-[11px] leading-relaxed mt-6" style={{ opacity: 0.3 }}>
                {org.disclaimer}
              </p>
            )}
          </>
        )}
      </div>
    </footer>
  );
}

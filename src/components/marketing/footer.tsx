"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";

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
    : [
        { href: "/", label: "Home" },
        { href: "/blog", label: "Partner Thoughts" },
        { href: "/contact", label: "Contact" },
      ];
  const navLinks = [...baseLinks, { href: "/login", label: "Investor Login" }];

  return (
    <footer className="bg-[#1A2640] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Top section — 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Col 1: Branding */}
          <div>
            <p className="font-bold text-sm tracking-widest uppercase mb-3">
              Partners + Capital
            </p>
            <p className="text-white/60 text-sm mb-4">
              Public Access to Private Markets
            </p>
            <p className="text-white/40 text-sm leading-relaxed">
              605 N High St Suite 212
              <br />
              Columbus OH 43215
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <p className="font-semibold text-sm tracking-wide uppercase mb-4">
              Navigation
            </p>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Newsletter */}
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
                className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#B07D3A] transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-[#B07D3A] hover:bg-[#7A5520] text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
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
        </div>

        {/* Bottom bar */}
        <hr className="border-white/10 mt-12 mb-6" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-white/40 text-xs">
          <p>&copy; 2015-{currentYear} Partners + Capital, LLC. All rights reserved.</p>
          <p>david@partnersandcapital.com</p>
        </div>

        {/* Disclaimer */}
        <p className="text-white/30 text-[11px] leading-relaxed mt-6">
          Past performance is not indicative of future results. All investments
          involve risk, including loss of principal. The information contained
          herein is confidential and intended solely for the named recipient.
        </p>
      </div>
    </footer>
  );
}

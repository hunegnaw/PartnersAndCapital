"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { LogIn, Menu, X } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";

interface NavLink {
  href: string;
  label: string;
}

interface MarketingHeaderProps {
  transparent?: boolean;
  navLinks?: NavLink[];
}

export function MarketingHeader({ transparent = true, navLinks: navLinksProp }: MarketingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const org = useOrganization();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const solid = !transparent || scrolled;
  const btnColor = solid ? org.secondaryColor : "#ffffff";

  const logoHref = session?.user
    ? (session.user as { role?: string }).role === "ADMIN"
      ? "/admin"
      : "/dashboard"
    : "/";

  const navLinks = navLinksProp && navLinksProp.length > 0
    ? navLinksProp
    : [{ href: "/", label: "Home" }];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        solid ? "bg-[#1A2640]" : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={logoHref}
          className="font-bold text-white text-sm tracking-widest uppercase border border-white/40 px-3 py-1.5 transition-colors hover:border-white/70"
        >
          Partners + Capital
        </Link>

        {/* Center nav — desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right — desktop login */}
        <div className="hidden md:block">
          <Link
            href="/login"
            className="px-4 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: btnColor,
              color: btnColor,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = btnColor;
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = btnColor;
            }}
          >
            <LogIn className="h-4 w-4" />
            Investor Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-[#1A2640] border-t border-white/10 px-6 pb-6 pt-2 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-white/70 hover:text-white text-sm transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="px-4 py-1.5 rounded text-sm inline-flex items-center gap-2 transition-colors"
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: org.secondaryColor,
              color: org.secondaryColor,
            }}
            onClick={() => setMobileOpen(false)}
          >
            <LogIn className="h-4 w-4" />
            Investor Login
          </Link>
        </div>
      )}
    </header>
  );
}

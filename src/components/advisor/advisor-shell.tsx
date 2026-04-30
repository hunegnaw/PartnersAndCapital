"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const portfolioNav = [
  { href: "/advisor/dashboard", label: "Dashboard" },
];

interface AdvisorShellProps {
  userName: string;
  initials: string;
  children: React.ReactNode;
}

export function AdvisorShell({ userName, initials, children }: AdvisorShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="h-14 bg-[#1A2640] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/advisor/dashboard" className="font-bold text-white text-sm tracking-widest uppercase border border-white/40 px-3 py-1.5 transition-colors hover:border-white/70">
            Partners + Capital
          </Link>
          <span className="bg-[#B07D3A] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
            Advisor Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-[#B07D3A] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-[#dfdedd] flex flex-col pt-6">
          <nav className="flex-1 px-4">
            {/* PORTFOLIO section */}
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-3 px-3">
              Portfolio
            </p>
            <ul className="space-y-0.5 mb-6">
              {portfolioNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? "border-l-2 border-[#B07D3A] text-[#B07D3A] font-medium bg-[#f5f5f3]"
                          : "text-[#5f5e5a] hover:text-[#B07D3A] hover:bg-[#f5f5f3]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-[#B07D3A]" : "bg-[#888780]"
                        }`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* ACCOUNT section */}
            <p className="text-[10px] font-semibold text-[#888780] tracking-widest uppercase mb-3 px-3">
              Account
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#5f5e5a] hover:text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#888780]" />
                  Log Out
                </button>
              </li>
            </ul>
          </nav>

          {/* Logged in user */}
          <div className="px-4 py-4 border-t border-[#dfdedd]">
            <p className="text-xs text-[#888780] truncate">{userName}</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-[#f5f5f3] overflow-auto">{children}</main>
      </div>
    </div>
  );
}

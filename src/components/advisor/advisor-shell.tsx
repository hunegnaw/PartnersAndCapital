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
      <header className="h-14 bg-[#0f1c2e] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm tracking-widest uppercase">
            Partners + Capital
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#b8860b]/20 text-[#b8860b]">
            Advisor Portal
          </span>
          <div className="h-8 w-8 rounded-full bg-[#b8860b] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-[#e8e0d4] flex flex-col pt-6">
          <nav className="flex-1 px-4">
            {/* PORTFOLIO section */}
            <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3 px-3">
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
                          ? "border-l-2 border-[#b8860b] text-[#b8860b] font-medium bg-[#faf8f5]"
                          : "text-[#4a4a4a] hover:text-[#b8860b] hover:bg-[#faf8f5]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-[#b8860b]" : "bg-[#d4c5a9]"
                        }`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* ACCOUNT section */}
            <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3 px-3">
              Account
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                  Log Out
                </button>
              </li>
            </ul>
          </nav>

          {/* Logged in user */}
          <div className="px-4 py-4 border-t border-[#e8e0d4]">
            <p className="text-xs text-[#9a8c7a] truncate">{userName}</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-[#faf8f5] overflow-auto">{children}</main>
      </div>
    </div>
  );
}

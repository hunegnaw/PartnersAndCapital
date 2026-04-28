import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotificationBell } from "@/components/portal/notification-bell";

const investorNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/investments", label: "Portfolio" },
  { href: "/documents", label: "Documents" },
  { href: "/capital-activity", label: "Distributions" },
  { href: "/advisors", label: "Advisor Access" },
];

const accountNav = [
  { href: "/settings", label: "Settings" },
  { href: "/support", label: "Support" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "CLIENT") {
    if (session.user.role === "ADVISOR") {
      redirect("/advisor/dashboard");
    }
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top nav bar */}
      <header className="h-14 bg-[#0f1c2e] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm tracking-widest uppercase">
            Partners + Capital
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/documents"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Documents
          </Link>
          <Link
            href="/advisors"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Advisor Access
          </Link>
          <NotificationBell />
          <div className="h-8 w-8 rounded-full bg-[#b8860b] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Light sidebar */}
        <aside className="w-60 bg-white border-r border-[#e8e0d4] flex flex-col pt-6">
          <nav className="flex-1 px-4">
            {/* INVESTOR section */}
            <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3 px-3">
              Investor
            </p>
            <ul className="space-y-0.5 mb-6">
              {investorNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="sidebar-link flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-[#b8860b] hover:bg-[#faf8f5] transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* ACCOUNT section */}
            <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3 px-3">
              Account
            </p>
            <ul className="space-y-0.5">
              {accountNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="sidebar-link flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-[#b8860b] hover:bg-[#faf8f5] transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                  Log Out
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 bg-[#faf8f5] overflow-auto">{children}</main>
      </div>
    </div>
  );
}

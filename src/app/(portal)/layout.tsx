import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotificationBell } from "@/components/portal/notification-bell";
import { getImpersonationContext } from "@/lib/impersonation";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { prisma } from "@/lib/prisma";

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

  const impersonation = await getImpersonationContext();

  if (session.user.role !== "CLIENT" && !impersonation) {
    if (session.user.role === "ADVISOR") {
      redirect("/advisor/dashboard");
    }
    // Admin/Super_Admin without impersonation — redirect to admin
    redirect("/admin");
  }

  // When impersonating, look up the client's name for the banner and initials
  let impersonatedClient: { id: string; name: string | null } | null = null;
  if (impersonation) {
    impersonatedClient = await prisma.user.findUnique({
      where: { id: impersonation.clientId },
      select: { id: true, name: true },
    });
  }

  const displayName = impersonation
    ? impersonatedClient?.name || "Client"
    : session.user.name;

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen flex-col">
      {impersonation && impersonatedClient && (
        <ImpersonationBanner
          clientName={impersonatedClient.name || "Client"}
          clientId={impersonation.clientId}
        />
      )}
      {/* Top nav bar */}
      <header className="h-14 bg-[#1A2640] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-sm tracking-widest uppercase">
            Partners + Capital
          </span>
          <span className="bg-[#B07D3A] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
            Client Portal
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
          <div className="h-8 w-8 rounded-full bg-[#B07D3A] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Navy sidebar */}
        <aside className="w-60 bg-[#2C3E5C] flex flex-col pt-6">
          <nav className="flex-1 px-4">
            {/* INVESTOR section */}
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
              Investor
            </p>
            <ul className="space-y-0.5 mb-6">
              {investorNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="sidebar-link flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/55 hover:text-[#E8D5B0] hover:bg-white/5 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* ACCOUNT section */}
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
              Account
            </p>
            <ul className="space-y-0.5">
              {accountNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="sidebar-link flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/55 hover:text-[#E8D5B0] hover:bg-white/5 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/api/auth/signout"
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/55 hover:text-red-300 hover:bg-white/5 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  Log Out
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 bg-[#f5f5f3] overflow-auto">{children}</main>
      </div>
    </div>
  );
}

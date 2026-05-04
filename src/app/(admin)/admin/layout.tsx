import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SavedColorsProvider } from "@/components/providers/saved-colors-provider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  // If 2FA setup is required by policy, redirect to settings
  if (session.user.requiresTwoFactorSetup) {
    redirect("/settings");
  }

  // Fetch sidebar counts
  const [clientCount, investmentCount, documentCount, advisorCount, ticketCount, pageCount, blogPostCount, mediaCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT", deletedAt: null } }),
      prisma.investment.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.advisor.count(),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.page.count({ where: { deletedAt: null } }),
      prisma.blogPost.count({ where: { deletedAt: null } }),
      prisma.media.count({ where: { deletedAt: null } }),
    ]);

  const manageNav = [
    { href: "/admin", label: "Clients", count: clientCount },
    { href: "/admin/investments", label: "Investments", count: investmentCount },
    { href: "/admin/documents", label: "Documents", count: documentCount },
    { href: "/admin/advisors", label: "Advisors", count: advisorCount },
    { href: "/admin/activity", label: "Activity Feed" },
    { href: "/admin/support", label: "Support", count: ticketCount > 0 ? ticketCount : undefined },
  ];

  const websiteNav = [
    { href: "/admin/pages", label: "Pages", count: pageCount },
    { href: "/admin/blog", label: "Blog Posts", count: blogPostCount },
    { href: "/admin/blog/categories", label: "Blog Categories" },
    { href: "/admin/media", label: "Media Library", count: mediaCount },
    { href: "/admin/footer", label: "Footer" },
  ];

  const systemNav = [
    { href: "/admin/users", label: "Admin Users" },
    { href: "/admin/audit-log", label: "Audit Log" },
    { href: "/admin/settings", label: "Settings" },
  ];

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="h-14 bg-[#1A2640] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="font-bold text-white text-sm tracking-widest uppercase border border-white/40 px-3 py-1.5 transition-colors hover:border-white/70">
            Partners + Capital
          </Link>
          <span className="bg-[#B07D3A] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
            Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/admin/audit-log"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Audit Log
          </Link>
          <Link
            href="/admin/settings"
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Settings
          </Link>
          <div className="h-8 w-8 rounded-full bg-[#B07D3A] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Navy sidebar */}
        <aside className="w-60 bg-[#2C3E5C] flex flex-col pt-6">
          <nav className="flex-1 px-4">
            {/* MANAGE section */}
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
              Manage
            </p>
            <ul className="space-y-0.5 mb-6">
              {manageNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2 text-sm rounded-md text-white/55 hover:text-[#E8D5B0] hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            {/* WEBSITE section */}
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
              Website
            </p>
            <ul className="space-y-0.5 mb-6">
              {websiteNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2 text-sm rounded-md text-white/55 hover:text-[#E8D5B0] hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            {/* SYSTEM section */}
            <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
              System
            </p>
            <ul className="space-y-0.5 mb-6">
              {systemNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/55 hover:text-[#E8D5B0] hover:bg-white/5 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Back to portal */}
            <div className="px-3 pt-4 border-t border-white/10">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/40 hover:text-white/60 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                Back to Portal
              </Link>
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/55 hover:text-red-300 hover:bg-white/5 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                Log Out
              </Link>
            </div>
          </nav>
        </aside>

        <main className="flex-1 bg-[#f5f5f3] overflow-auto">
          <SavedColorsProvider>{children}</SavedColorsProvider>
        </main>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

  // Fetch sidebar counts
  const [clientCount, investmentCount, documentCount, advisorCount, ticketCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT", deletedAt: null } }),
      prisma.investment.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.advisor.count(),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

  const manageNav = [
    { href: "/admin", label: "Clients", count: clientCount },
    { href: "/admin/investments", label: "Investments", count: investmentCount },
    { href: "/admin/documents", label: "Documents", count: documentCount },
    { href: "/admin/advisors", label: "Advisors", count: advisorCount },
    { href: "/admin/activity", label: "Activity Feed" },
    { href: "/admin/support", label: "Support", count: ticketCount > 0 ? ticketCount : undefined },
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
      <header className="h-14 bg-[#0f1c2e] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-sm tracking-widest uppercase">
            Partners + Capital
          </span>
          <span className="bg-[#b8860b] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
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
          <div className="h-8 w-8 rounded-full bg-[#b8860b] flex items-center justify-center text-xs font-semibold text-white">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Light sidebar */}
        <aside className="w-60 bg-white border-r border-[#e8e0d4] flex flex-col pt-6">
          <nav className="flex-1 px-4">
            {/* MANAGE section */}
            <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3 px-3">
              Manage
            </p>
            <ul className="space-y-0.5 mb-6">
              {manageNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-[#b8860b] hover:bg-[#faf8f5] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className="text-[10px] bg-[#f5f0e8] text-[#9a8c7a] px-2 py-0.5 rounded-full tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            {/* SYSTEM section */}
            <p className="text-[10px] font-semibold text-[#9a8c7a] tracking-widest uppercase mb-3 px-3">
              System
            </p>
            <ul className="space-y-0.5 mb-6">
              {systemNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-[#b8860b] hover:bg-[#faf8f5] transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Back to portal */}
            <div className="px-3 pt-4 border-t border-[#e8e0d4]">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#9a8c7a] hover:text-[#4a4a4a] transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                Back to Portal
              </Link>
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-[#4a4a4a] hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4c5a9]" />
                Log Out
              </Link>
            </div>
          </nav>
        </aside>

        <main className="flex-1 bg-[#faf8f5] overflow-auto">{children}</main>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Shield,
  Home,
  Users,
  BarChart3,
  FileText,
  Activity,
  ClipboardList,
  Settings,
  UserCog,
  Briefcase,
  LogOut,
} from "lucide-react";

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
  const [clientCount, investmentCount, documentCount, advisorCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT", deletedAt: null } }),
      prisma.investment.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.advisor.count(),
    ]);

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/clients", label: "Clients", icon: Users, count: clientCount },
    { href: "/admin/investments", label: "Investments", icon: Briefcase, count: investmentCount },
    { href: "/admin/documents", label: "Documents", icon: FileText, count: documentCount },
    { href: "/admin/activity", label: "Activity Feed", icon: Activity },
    { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
    { href: "/admin/advisors", label: "Advisors", icon: UserCog, count: advisorCount },
    { href: "/admin/users", label: "Admin Users", icon: Shield },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="h-14 bg-[#0f1c2e] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="font-medium text-sm">Portal</span>
          </Link>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            <span className="font-semibold text-white">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/80">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white">
              {session.user.name?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="text-sm">{session.user.name}</span>
          </div>
          <Link
            href="/api/auth/signout"
            className="text-white/40 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-[#0f1c2e] text-white flex flex-col">
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between px-4 py-2.5 text-sm rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    {item.count !== undefined && (
                      <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

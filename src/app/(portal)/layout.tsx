import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  DollarSign,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/investments", label: "Portfolio", icon: Briefcase },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/capital-activity", label: "Distributions", icon: DollarSign },
  { href: "/advisors", label: "Advisors", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="h-14 bg-[#0f1c2e] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-lg">
            Partners + Capital
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/80">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white">
              {session.user.name?.[0]?.toUpperCase() || "U"}
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
                    className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
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

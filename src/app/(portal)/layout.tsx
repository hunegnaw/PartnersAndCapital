import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BarChart3, FileText, DollarSign, Users, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/investments", label: "Investments", icon: BarChart3 },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/capital-activity", label: "Capital Activity", icon: DollarSign },
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
    // Admins can still view portal if needed, but advisors go to their own layout
    if (session.user.role === "ADVISOR") {
      redirect("/advisor/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="h-14 bg-primary border-b border-primary/80 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary-foreground text-lg">Partners + Capital</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-medium text-primary-foreground">
              {session.user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="text-sm">{session.user.name}</span>
          </div>
          <Link
            href="/api/auth/signout"
            className="text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-primary text-primary-foreground flex flex-col">
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-md text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 bg-muted overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

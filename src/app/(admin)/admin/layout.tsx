import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Home, Users, BarChart3, FileText, Activity, Settings, Key, ClipboardList } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/investments", label: "Investments", icon: BarChart3 },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/activity", label: "Activity Feed", icon: Activity },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="h-14 bg-primary border-b border-primary/80 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-primary-foreground hover:text-primary-foreground/80 transition-colors">
            <Home className="h-5 w-5" />
            <span className="font-semibold">Portal</span>
          </Link>
          <span className="text-primary-foreground/40">|</span>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            <span className="font-semibold text-primary-foreground">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-medium text-primary-foreground">
              {session.user.name?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="text-sm">{session.user.name}</span>
          </div>
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

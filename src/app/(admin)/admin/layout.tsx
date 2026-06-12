import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SavedColorsProvider } from "@/components/providers/saved-colors-provider";
import { getOrganization } from "@/lib/organization";
import { SidebarNav } from "@/components/admin/sidebar-nav";
import { MobileSidebarToggle, MobileSidebarWrapper } from "@/components/mobile-sidebar";

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

  // 2FA setup requirement is handled by the login page redirect.

  const [org, adminUser] = await Promise.all([
    getOrganization(),
    prisma.user.findUnique({
      where: { id: session.user.id as string },
      select: { profileImageUrl: true },
    }),
  ]);

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <div className="flex min-h-screen flex-col" style={{ fontFamily: "'Inter', sans-serif", "--radius": "5px" } as React.CSSProperties}>
      {/* Header */}
      <header className="h-14 bg-[#1A2640] border-b border-white/10 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <MobileSidebarToggle />
          <Link href="/admin" className={org?.logoUrl ? "block" : "font-bold text-white text-sm tracking-widest uppercase border border-white/40 px-3 py-1.5 transition-colors hover:border-white/70"}>
            {org?.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={org.logoUrl} alt={org.name} className="h-7 w-auto object-contain" />
            ) : (
              org?.name || "Partners + Capital"
            )}
          </Link>
          <span className="hidden sm:inline bg-[#B07D3A] text-white text-[10px] font-semibold px-2.5 py-0.5 tracking-wider uppercase">
            Admin Portal
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/admin/audit-log"
            className="hidden md:inline text-white/60 hover:text-white text-sm transition-colors"
          >
            Audit Log
          </Link>
          <Link
            href="/admin/settings"
            className="hidden md:inline text-white/60 hover:text-white text-sm transition-colors"
          >
            Settings
          </Link>
          {adminUser?.profileImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={adminUser.profileImageUrl} alt={session.user.name || "Admin"} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#B07D3A] flex items-center justify-center text-xs font-semibold text-white">
              {initials}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <MobileSidebarWrapper>
          <SidebarNav />
        </MobileSidebarWrapper>

        <main className="flex-1 bg-[#f5f5f3] overflow-auto">
          <SavedColorsProvider>{children}</SavedColorsProvider>
        </main>
      </div>
    </div>
  );
}

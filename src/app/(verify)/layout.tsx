import { auth, twoFactorPending } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrganization } from "@/lib/organization";
import { IdleTimeout } from "@/components/idle-timeout";
import Link from "next/link";

export default async function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Partial session (password OK, required 2FA not yet completed) — finish at /login.
  if (twoFactorPending(session.user)) {
    redirect("/login");
  }

  // Required 2FA not yet enrolled — enrollment takes priority over KYC verification.
  if (session.user.requiresTwoFactorSetup) {
    redirect("/setup-2fa");
  }

  // If already approved, go straight to dashboard
  if (session.user.role === "CLIENT") {
    const verification = await prisma.verification.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    });
    if (verification?.status === "APPROVED") {
      redirect("/dashboard");
    }
  }

  const org = await getOrganization();

  return (
    <div
      className="min-h-screen bg-[#f5f5f3] flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <IdleTimeout />
      <header className="h-14 bg-[#1A2640] border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/verify"
            className={
              org?.logoUrl
                ? "block"
                : "font-bold text-white text-sm tracking-widest uppercase border border-white/40 px-3 py-1.5 transition-colors hover:border-white/70"
            }
          >
            {org?.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={org.logoUrl}
                alt={org.name}
                className="h-7 w-auto object-contain"
              />
            ) : (
              org?.name || "Partners + Capital"
            )}
          </Link>
          <span className="bg-white/10 text-white/60 text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
            Secure verification
          </span>
        </div>
        <Link
          href="/signout"
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          Sign Out
        </Link>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

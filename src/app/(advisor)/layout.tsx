import { auth, twoFactorPending } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdvisorShell } from "@/components/advisor/advisor-shell";
import { IdleTimeout } from "@/components/idle-timeout";

export default async function AdvisorLayout({
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

  // Required 2FA not yet enrolled (mandatory policy) — force setup first.
  if (session.user.requiresTwoFactorSetup) {
    redirect("/setup-2fa");
  }

  if (session.user.role !== "ADVISOR") {
    redirect("/");
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <AdvisorShell userName={session.user.name || "Advisor"} initials={initials}>
      <IdleTimeout />
      {children}
    </AdvisorShell>
  );
}

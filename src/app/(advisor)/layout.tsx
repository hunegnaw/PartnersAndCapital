import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdvisorShell } from "@/components/advisor/advisor-shell";

export default async function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
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
      {children}
    </AdvisorShell>
  );
}

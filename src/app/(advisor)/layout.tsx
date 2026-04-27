import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="h-14 bg-primary border-b border-primary/80 flex items-center justify-between px-6">
        <span className="font-semibold text-primary-foreground text-lg">Partners + Capital — Advisor</span>
        <div className="flex items-center gap-2 text-primary-foreground/80">
          <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-medium text-primary-foreground">
            {session.user.name?.[0]?.toUpperCase() || "A"}
          </div>
          <span className="text-sm">{session.user.name}</span>
        </div>
      </header>
      <main className="flex-1 bg-muted overflow-auto">{children}</main>
    </div>
  );
}

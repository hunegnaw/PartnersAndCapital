import { auth, twoFactorPending } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SetupTwoFactorClient } from "./setup-client";

export const dynamic = "force-dynamic";

/**
 * Forced two-factor enrollment. Reachable by any logged-in user whose session is
 * flagged `requiresTwoFactorSetup` — every admin (2FA is mandatory for admins),
 * plus any user under a "mandatory" org policy. It lives in the public (auth)
 * group, OUTSIDE the role-gated layouts, so enforcing the redirect from those
 * layouts cannot loop.
 */
export default async function SetupTwoFactorPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // A partial (password-only) session must finish its pending 2FA challenge first.
  if (twoFactorPending(session.user)) {
    redirect("/login");
  }

  // Already enrolled / not required — send the user to their portal home.
  if (!session.user.requiresTwoFactorSetup) {
    const role = session.user.role;
    if (role === "ADMIN" || role === "SUPER_ADMIN") redirect("/admin");
    if (role === "ADVISOR") redirect("/advisor/dashboard");
    redirect("/dashboard");
  }

  return <SetupTwoFactorClient />;
}

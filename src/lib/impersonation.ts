import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const COOKIE_NAME = "impersonating";

export interface ImpersonationContext {
  adminId: string;
  clientId: string;
  isImpersonating: true;
}

/**
 * Check if the current admin session is impersonating a client.
 * Returns null if not impersonating or if the session is not admin.
 */
export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return null;

  const cookieStore = await cookies();
  const clientId = cookieStore.get(COOKIE_NAME)?.value;
  if (!clientId) return null;

  return {
    adminId: session.user.id as string,
    clientId,
    isImpersonating: true,
  };
}

/**
 * Returns the effective user ID for portal data queries.
 * If an admin is impersonating, returns the client's ID.
 * Otherwise returns the authenticated user's own ID.
 */
export async function getEffectiveUserId(): Promise<{
  userId: string;
  isImpersonating: boolean;
}> {
  const impersonation = await getImpersonationContext();
  if (impersonation) {
    return { userId: impersonation.clientId, isImpersonating: true };
  }
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No authenticated user");
  }
  return { userId: session.user.id as string, isImpersonating: false };
}

/**
 * Guard that blocks write operations while impersonating.
 * Returns a 403 NextResponse if impersonating, null otherwise.
 */
export async function requireNotImpersonating(): Promise<NextResponse | null> {
  const ctx = await getImpersonationContext();
  if (ctx) {
    return NextResponse.json(
      { error: "Cannot modify data while viewing as another user" },
      { status: 403 }
    );
  }
  return null;
}

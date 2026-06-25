import { auth, twoFactorPending } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

interface AuthResult {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  requiresTwoFactorSetup: boolean;
}

export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // A password-only session whose required second factor is not yet verified is
  // not fully authenticated — reject it everywhere except the NextAuth endpoints
  // (which this guard does not protect) used to complete the 2FA step.
  if (twoFactorPending(session.user)) {
    return NextResponse.json(
      { error: "Two-factor authentication required" },
      { status: 401 }
    );
  }
  return session.user as AuthResult;
}

// A user flagged for forced 2FA enrollment (every admin; any user under a
// "mandatory" policy) may reach ONLY the 2FA setup endpoints — which use
// requireAuth, not the role guards below — until they finish enrolling.
function blockIfEnrollmentPending(result: AuthResult): NextResponse | null {
  if (result.requiresTwoFactorSetup) {
    return NextResponse.json(
      { error: "Two-factor authentication setup required" },
      { status: 403 }
    );
  }
  return null;
}

export async function requireAdmin(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== "ADMIN" && result.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return blockIfEnrollmentPending(result) ?? result;
}

export async function requireSuperAdmin(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return blockIfEnrollmentPending(result) ?? result;
}

export async function requireClient(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== "CLIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return blockIfEnrollmentPending(result) ?? result;
}

export async function requireAdvisor(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  if (result.role !== "ADVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return blockIfEnrollmentPending(result) ?? result;
}

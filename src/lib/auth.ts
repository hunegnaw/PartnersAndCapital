import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import type { User, Role } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";
import type { Session } from "next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  trustHost: true,
  session: {
    strategy: "jwt",
    // Rolling 15-minute idle window. The token expires 15 minutes after the last
    // time it was refreshed; the SessionProvider re-fetches every 5 minutes while
    // a tab is open (rotating the token, since updateAge < maxAge), so active
    // users stay signed in while an abandoned session lapses within ~15 minutes.
    // The client-side <IdleTimeout> signs the user out for the same window.
    maxAge: 15 * 60,
    updateAge: 5 * 60,
  },
  pages: {
    signIn: "/login",
    signOut: "/signout",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            verification: { select: { status: true } },
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Check if account is soft-deleted
        if (user.deletedAt) {
          throw new Error("This account has been deactivated");
        }

        // Fetch organization 2FA policy
        const org = await prisma.organization.findFirst({
          select: { twoFactorPolicy: true },
        });
        const twoFactorPolicy = (org?.twoFactorPolicy || "optional").toLowerCase();

        // Compute verification requirement for CLIENT users
        const requiresVerification =
          user.role === "CLIENT" &&
          (!user.verification || user.verification.status !== "APPROVED");

        // Admins must always use 2FA, regardless of the org-wide policy.
        const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

        // If policy = "disabled": skip 2FA entirely — but never for admins.
        if (twoFactorPolicy === "disabled" && !isAdmin) {
          // Update lastLoginAt (fire-and-forget)
          prisma.user
            .update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(console.error);

          createAuditLog({
            userId: user.id,
            action: "AUTH_LOGIN",
            targetType: "USER",
            targetId: user.id,
            details: { method: "credentials" },
          }).catch(console.error);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            twoFactorRequired: false,
            twoFactorVerified: false,
            requiresTwoFactorSetup: false,
            requiresVerification,
          } as {
            id: string;
            email: string;
            name: string | null;
            role: Role;
            twoFactorRequired: boolean;
            twoFactorVerified: boolean;
            requiresTwoFactorSetup: boolean;
            requiresVerification: boolean;
          };
        }

        // Force enrollment when 2FA is required but not yet set up — for any user
        // under a "mandatory" policy, and for every admin regardless of policy.
        if (!user.twoFactorEnabled && (twoFactorPolicy === "mandatory" || isAdmin)) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            twoFactorRequired: false,
            twoFactorVerified: false,
            requiresTwoFactorSetup: true,
            requiresVerification,
          } as {
            id: string;
            email: string;
            name: string | null;
            role: Role;
            twoFactorRequired: boolean;
            twoFactorVerified: boolean;
            requiresTwoFactorSetup: boolean;
            requiresVerification: boolean;
          };
        }

        // Check if 2FA is enabled — if so, return partial session marker
        if (user.twoFactorEnabled) {
          const twoFactorCode = credentials.twoFactorCode as string | undefined;
          if (!twoFactorCode) {
            // Send SMS code automatically
            const { sendTwoFactorCode } = await import("@/lib/two-factor");
            sendTwoFactorCode(user.id).catch(console.error);

            // Return user with a flag indicating 2FA is needed
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              twoFactorRequired: true,
              twoFactorVerified: false,
              requiresTwoFactorSetup: false,
              requiresVerification,
            } as {
              id: string;
              email: string;
              name: string | null;
              role: Role;
              twoFactorRequired: boolean;
              twoFactorVerified: boolean;
              requiresTwoFactorSetup: boolean;
              requiresVerification: boolean;
            };
          }

          // Verify 2FA code - try TOTP first, then backup codes
          const { verifyTOTP } = await import("@/lib/two-factor");
          const secret = await prisma.twoFactorSecret.findUnique({
            where: { userId: user.id },
          });

          let codeValid = false;

          // Check if it's a TOTP code (6 digits)
          if (/^\d{6}$/.test(twoFactorCode) && secret) {
            codeValid = verifyTOTP(secret.secret, twoFactorCode);
          }

          // If TOTP didn't work, try backup codes
          if (!codeValid) {
            const backupCodes = await prisma.backupCode.findMany({
              where: { userId: user.id, used: false },
            });

            for (const bc of backupCodes) {
              const match = await bcrypt.compare(twoFactorCode, bc.codeHash);
              if (match) {
                codeValid = true;
                // Mark backup code as used
                await prisma.backupCode.update({
                  where: { id: bc.id },
                  data: { used: true, usedAt: new Date() },
                });
                break;
              }
            }
          }

          if (!codeValid) {
            throw new Error("Invalid two-factor authentication code");
          }
        }

        // Update lastLoginAt (fire-and-forget)
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(console.error);

        // Audit log (fire-and-forget)
        createAuditLog({
          userId: user.id,
          action: "AUTH_LOGIN",
          targetType: "USER",
          targetId: user.id,
          details: { method: "credentials" },
        }).catch(console.error);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          twoFactorRequired: false,
          twoFactorVerified: user.twoFactorEnabled,
          requiresTwoFactorSetup: false,
          requiresVerification,
        } as {
          id: string;
          email: string;
          name: string | null;
          role: Role;
          twoFactorRequired: boolean;
          twoFactorVerified: boolean;
          requiresTwoFactorSetup: boolean;
          requiresVerification: boolean;
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as User).role;
        token.twoFactorRequired = (user as Record<string, unknown>).twoFactorRequired as boolean;
        token.twoFactorVerified = (user as Record<string, unknown>).twoFactorVerified as boolean;
        token.requiresTwoFactorSetup = (user as Record<string, unknown>).requiresTwoFactorSetup as boolean;
        token.requiresVerification = (user as Record<string, unknown>).requiresVerification as boolean;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.twoFactorRequired = token.twoFactorRequired as boolean;
        session.user.twoFactorVerified = token.twoFactorVerified as boolean;
        session.user.requiresTwoFactorSetup = token.requiresTwoFactorSetup as boolean;
        session.user.requiresVerification = token.requiresVerification as boolean;
      }
      return session;
    },
  },
});

/**
 * A credentials login that passed the password check but has NOT yet completed
 * its required second factor still mints a valid session/JWT — NextAuth needs a
 * non-null `authorize()` return to carry the `twoFactorRequired` flag back to the
 * login UI. Such a partial session must NEVER be treated as fully authenticated.
 * Enforce completion server-side (in layouts and API guards), since the login
 * page's 2FA step is only a client-side prompt and can be skipped by navigating
 * directly to a protected URL.
 */
export function twoFactorPending(user: Session["user"]): boolean {
  return user.twoFactorRequired && !user.twoFactorVerified;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

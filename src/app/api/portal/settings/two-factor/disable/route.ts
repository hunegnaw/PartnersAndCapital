import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { verifyTOTP } from "@/lib/two-factor";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    // Get the current secret
    const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTP(twoFactorSecret.secret, code);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Disable 2FA: update user, delete secret, delete backup codes
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false },
      }),
      prisma.twoFactorSecret.delete({
        where: { userId: user.id },
      }),
      prisma.backupCode.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    await createAuditLog({
      userId: user.id,
      action: "DISABLE_TWO_FACTOR",
      targetType: "User",
      targetId: user.id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

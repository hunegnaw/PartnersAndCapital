import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { verifyTOTP } from "@/lib/two-factor";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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

    // Get the unverified secret
    const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorSecret) {
      return NextResponse.json(
        { error: "Two-factor setup not initiated. Please set up 2FA first." },
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

    // Mark secret as verified and enable 2FA on user
    await Promise.all([
      prisma.twoFactorSecret.update({
        where: { userId: user.id },
        data: { verified: true },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      }),
    ]);

    // Generate 10 backup codes
    const backupCodes: string[] = [];
    const hashedCodes: { codeHash: string }[] = [];

    for (let i = 0; i < 10; i++) {
      const rawCode = crypto.randomBytes(4).toString("hex");
      const formatted = `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}`;
      backupCodes.push(formatted);
      const hash = await bcrypt.hash(formatted, 10);
      hashedCodes.push({ codeHash: hash });
    }

    // Delete old backup codes and create new ones
    await prisma.backupCode.deleteMany({ where: { userId: user.id } });
    await prisma.backupCode.createMany({
      data: hashedCodes.map((hc) => ({
        userId: user.id,
        codeHash: hc.codeHash,
      })),
    });

    await createAuditLog({
      userId: user.id,
      action: "ENABLE_TWO_FACTOR",
      targetType: "User",
      targetId: user.id,
      request,
    });

    return NextResponse.json({ backupCodes });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateTOTPSecret } from "@/lib/two-factor";
import QRCode from "qrcode";

export async function POST() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    // Generate TOTP secret
    const { secret, uri } = generateTOTPSecret(user.email);

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(uri);

    // Upsert TwoFactorSecret (unverified)
    await prisma.twoFactorSecret.upsert({
      where: { userId: user.id },
      update: {
        secret,
        verified: false,
      },
      create: {
        userId: user.id,
        secret,
        verified: false,
      },
    });

    return NextResponse.json({ secret, qrCodeUrl });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

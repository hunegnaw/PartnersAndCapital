import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateTOTPSecret, generateTOTPCode } from "@/lib/two-factor";
import { sendSMS } from "@/lib/sms";
import { requireNotImpersonating } from "@/lib/impersonation";

export async function POST(request: Request) {
  try {
    const blocked = await requireNotImpersonating();
    if (blocked) return blocked;

    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const body = await request.json().catch(() => ({}));
    const { phone } = body;

    // If phone is provided, this is a new setup — generate secret and send code
    // If no phone, this is a resend — use existing secret and phone on file
    if (phone) {
      // Generate TOTP secret
      const { secret } = generateTOTPSecret(user.email);

      // Upsert TwoFactorSecret (unverified)
      await prisma.twoFactorSecret.upsert({
        where: { userId: user.id },
        update: { secret, verified: false },
        create: { userId: user.id, secret, verified: false },
      });

      // Update user's phone number
      await prisma.user.update({
        where: { id: user.id },
        data: { phone },
      });

      // Generate current code and send via SMS
      const code = generateTOTPCode(secret);
      const sent = await sendSMS(phone, `Your verification code is: ${code}`);

      if (!sent) {
        return NextResponse.json(
          { error: "Failed to send verification code" },
          { status: 500 }
        );
      }

      return NextResponse.json({ codeSent: true });
    }

    // Resend: use existing secret + phone
    const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
      where: { userId: user.id },
    });

    if (!twoFactorSecret) {
      return NextResponse.json(
        { error: "No 2FA setup in progress. Please provide a phone number." },
        { status: 400 }
      );
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });

    if (!fullUser?.phone) {
      return NextResponse.json(
        { error: "No phone number on file" },
        { status: 400 }
      );
    }

    const code = generateTOTPCode(twoFactorSecret.secret);
    const sent = await sendSMS(fullUser.phone, `Your verification code is: ${code}`);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ codeSent: true });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

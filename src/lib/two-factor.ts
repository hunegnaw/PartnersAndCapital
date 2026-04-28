import * as OTPAuth from "otpauth";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";

export function generateTOTPSecret(email: string, issuer: string = "Partners + Capital"): {
  secret: string;
  uri: string;
} {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function generateTOTPCode(secret: string): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return totp.generate();
}

export async function sendTwoFactorCode(userId: string): Promise<boolean> {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
  });

  if (!twoFactorSecret) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  if (!user?.phone) {
    return false;
  }

  const code = generateTOTPCode(twoFactorSecret.secret);
  return sendSMS(user.phone, `Your verification code is: ${code}`);
}

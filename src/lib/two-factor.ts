import * as OTPAuth from "otpauth";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/sms";
import { SMS_CODE_EXPIRY_MINUTES, smsCodeMessage } from "@/lib/two-factor-config";

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

/** Result of verifying a submitted SMS code. */
export type SmsCodeResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "missing" };

function generateNumericCode(): string {
  // 6-digit, cryptographically random, zero-padded.
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Generate a fresh single-use SMS code, store its hash + expiry on the user's
 * TwoFactorSecret row, and return the plaintext code to send. Returns null if no
 * TwoFactorSecret row exists. Any previously issued code is overwritten.
 */
export async function issueSmsCode(userId: string): Promise<string | null> {
  const code = generateNumericCode();
  const smsCodeHash = await bcrypt.hash(code, 10);
  const smsCodeExpiresAt = new Date(Date.now() + SMS_CODE_EXPIRY_MINUTES * 60 * 1000);

  try {
    await prisma.twoFactorSecret.update({
      where: { userId },
      data: { smsCodeHash, smsCodeExpiresAt },
    });
  } catch (error) {
    // No TwoFactorSecret row (setup not initiated), or the DB write failed —
    // log it instead of failing silently so this isn't invisible in prod.
    console.error(`[2FA] issueSmsCode: failed to store code for user ${userId}:`, error);
    return null;
  }
  return code;
}

/**
 * Verify a submitted SMS code against the stored hash. Codes are single-use
 * (cleared on success) and expire after SMS_CODE_EXPIRY_MINUTES.
 */
export async function verifySmsCode(userId: string, code: string): Promise<SmsCodeResult> {
  const record = await prisma.twoFactorSecret.findUnique({ where: { userId } });
  if (!record?.smsCodeHash || !record.smsCodeExpiresAt) {
    return { ok: false, reason: "missing" };
  }
  if (record.smsCodeExpiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  const matches = await bcrypt.compare(code, record.smsCodeHash);
  if (!matches) {
    return { ok: false, reason: "invalid" };
  }
  // Single-use: invalidate the code now that it has been consumed.
  await prisma.twoFactorSecret.update({
    where: { userId },
    data: { smsCodeHash: null, smsCodeExpiresAt: null },
  });
  return { ok: true };
}

/**
 * Send a login/challenge SMS code to the user's phone. Requires an existing
 * TwoFactorSecret and a phone number on file.
 */
export async function sendTwoFactorCode(userId: string): Promise<boolean> {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
  });
  if (!twoFactorSecret) {
    console.error(`[2FA] sendTwoFactorCode: no TwoFactorSecret for user ${userId}`);
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
  if (!user?.phone) {
    console.error(`[2FA] sendTwoFactorCode: no phone on file for user ${userId}`);
    return false;
  }

  const code = await issueSmsCode(userId);
  if (!code) {
    return false;
  }
  return sendSMS(user.phone, smsCodeMessage(code));
}

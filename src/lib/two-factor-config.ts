// Shared 2FA / SMS one-time-code configuration. Kept free of server-only imports
// (prisma, sms) so client components can show the same expiry the server enforces.

/**
 * How long an SMS verification code stays valid. Applies consistently to every
 * SMS code: login challenge, 2FA setup verification, and disable confirmation.
 * 10 minutes is the common standard for SMS one-time codes.
 */
export const SMS_CODE_EXPIRY_MINUTES = 10;

/** The SMS body for a verification code — states the expiry and a safety note. */
export function smsCodeMessage(code: string): string {
  return `Partners + Capital: Your verification code is ${code}. It expires in ${SMS_CODE_EXPIRY_MINUTES} minutes. For your security, never share this code.`;
}

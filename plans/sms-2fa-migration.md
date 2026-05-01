# 2FA Migration: TOTP Authenticator → Twilio SMS

## Context

Replace the current TOTP-based 2FA (authenticator app + QR code) with SMS-based 2FA via Twilio. Users will receive a 6-digit code via text message instead of using an authenticator app. Until the Twilio account is set up, SMS sending will be stubbed out (code logged to console) so the flow can be built and tested without live credentials.

---

## Approach

The core database schema stays the same — `TwoFactorSecret` stores the TOTP secret (still needed to generate time-based codes server-side), and `User.phone` (already exists) stores the SMS destination. The key changes are:

1. **Setup flow**: Instead of QR code → scan → verify, it becomes: enter phone → send SMS code → verify code
2. **Login flow**: Instead of "open authenticator app", the server sends an SMS code automatically when 2FA is required
3. **SMS sending**: New `src/lib/sms.ts` module using Twilio SDK, with a stub mode when `TWILIO_ACCOUNT_SID` is not set (logs code to console)
4. **Remove**: QR code generation, `otpauth` URI display, authenticator app references
5. **Keep**: Backup codes (unchanged), TOTP verification logic (reused server-side to validate SMS codes), audit logging

---

## Files to Modify

### New File
- `src/lib/sms.ts` — Twilio SMS sending + stub mode

### Modified Files
| File | Change |
|------|--------|
| `src/lib/two-factor.ts` | Add `generateAndSendSMSCode()` that creates a TOTP code and sends via SMS |
| `src/lib/auth.ts` | On 2FA-required login, auto-send SMS code before returning partial session |
| `src/app/api/portal/settings/two-factor/setup/route.ts` | Accept phone number, send verification SMS (no QR code) |
| `src/app/api/portal/settings/two-factor/verify/route.ts` | Verify SMS code (same TOTP verify logic, no change needed) |
| `src/app/api/portal/settings/two-factor/disable/route.ts` | Send SMS code to verify before disabling (replace TOTP prompt) |
| `src/app/(auth)/login/page.tsx` | Replace 6-digit authenticator input with SMS code input + "Resend code" button |
| `src/components/settings/two-factor-setup.tsx` | Replace QR flow with phone number entry → SMS verify flow |
| `src/components/settings/two-factor-manage.tsx` | Update descriptions from "authenticator app" to "text message" |
| `src/components/auth/two-factor-input.tsx` | Update labels/descriptions |
| `src/app/(admin)/admin/settings/page.tsx` | Update 2FA policy descriptions |
| `MANUAL.md` | Update 2FA documentation |

### Packages
- **Install**: `twilio` (Twilio Node.js SDK)
- **Keep**: `otpauth` (still used server-side to generate/verify codes), `bcryptjs` (backup codes)
- **Remove**: `qrcode`, `@types/qrcode` (no longer needed)

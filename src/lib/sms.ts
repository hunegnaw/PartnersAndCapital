import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !fromNumber) {
    // Twilio not configured → no real SMS is sent. Logged as a WARNING (not a
    // plain console.log) so it shows up even when only checking the error stream.
    const missing = [
      !accountSid && "TWILIO_ACCOUNT_SID",
      !authToken && "TWILIO_AUTH_TOKEN",
      !fromNumber && "TWILIO_PHONE_NUMBER",
    ]
      .filter(Boolean)
      .join(", ");
    console.warn(
      `[SMS] STUB — not sent (Twilio not configured; missing: ${missing || "client"}). To=${to}`
    );
    return true;
  }

  try {
    const message = await client.messages.create({ body, from: fromNumber, to });
    console.info(`[SMS] sent to ${to} sid=${message.sid} status=${message.status}`);
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send to", to, "-", error);
    return false;
  }
}

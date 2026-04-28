import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !fromNumber) {
    console.log(`[SMS STUB] To: ${to} | Body: ${body}`);
    return true;
  }

  try {
    await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    return true;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

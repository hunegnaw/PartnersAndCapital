import { getOrganization } from "@/lib/organization";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  fromName,
  replyTo,
}: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.ELASTIC_EMAIL_API_KEY;

  if (!apiKey) {
    console.warn("ELASTIC_EMAIL_API_KEY not set, skipping email send");
    return false;
  }

  const org = await getOrganization();
  const orgEmail = org?.email || process.env.EMAIL_FROM || "";
  const orgName = org?.name || process.env.EMAIL_FROM_NAME || "Partners + Capital";

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      from: from || orgEmail,
      fromName: fromName || orgName,
      to,
      subject,
      bodyHtml: html,
      isTransactional: "true",
    });

    const reply = replyTo || orgEmail;
    if (reply) {
      params.set("replyTo", reply);
    }

    const response = await fetch(
      "https://api.elasticemail.com/v2/email/send",
      {
        method: "POST",
        body: params,
      }
    );

    const data = await response.json();
    if (!data.success) {
      console.error("Email send failed:", data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

export async function getOrgEmail(): Promise<string> {
  const org = await getOrganization();
  return org?.email || process.env.EMAIL_FROM || "";
}

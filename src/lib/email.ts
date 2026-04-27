interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  fromName,
}: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.ELASTIC_EMAIL_API_KEY;
  const defaultFrom = process.env.EMAIL_FROM || "noreply@partnersandcapital.com";
  const defaultFromName = process.env.EMAIL_FROM_NAME || "Partners + Capital";

  if (!apiKey) {
    console.warn("ELASTIC_EMAIL_API_KEY not set, skipping email send");
    return false;
  }

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      from: from || defaultFrom,
      fromName: fromName || defaultFromName,
      to,
      subject,
      bodyHtml: html,
      isTransactional: "true",
    });

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

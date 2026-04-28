// Branded email templates for Partners + Capital investor portal

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Partners + Capital</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf8f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf8f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f1c2e; padding: 28px 40px; text-align: center;">
              <span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Partners + Capital</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e8e5e0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #9a9a9a; line-height: 1.5;">Partners + Capital</p>
              <p style="margin: 0; font-size: 11px; color: #b0b0b0; line-height: 1.5;">This is an automated message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function emailButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
    <tr>
      <td style="background-color: #0f1c2e; border-radius: 6px;">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: 0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${text}</a>
      </td>
    </tr>
  </table>`;
}

// ─── Template Functions ──────────────────────────────────────────────

interface AdvisorInviteEmailParams {
  clientName: string;
  advisorName: string;
  permissionLevel: string;
  expiresAt: Date | string | null;
  acceptUrl: string;
}

export function advisorInviteEmail({
  clientName,
  advisorName,
  permissionLevel,
  expiresAt,
  acceptUrl,
}: AdvisorInviteEmailParams): string {
  const expiryNote = expiresAt
    ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This invitation expires on ${new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>`
    : "";

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Portfolio Access Invitation</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Hello ${advisorName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;"><strong style="color: #1a1a1a;">${clientName}</strong> has invited you to view their investment portfolio on Partners + Capital.</p>
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.05em;">Your access level</p>
    <p style="margin: 0 0 4px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">${permissionLevel}</p>
    ${emailButton("Accept Invitation", acceptUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you were not expecting this invitation, you can safely ignore this email.</p>
    ${expiryNote}`;

  return emailWrapper(content);
}

interface PasswordResetEmailParams {
  userName: string;
  resetUrl: string;
}

export function passwordResetEmail({
  userName,
  resetUrl,
}: PasswordResetEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Reset Your Password</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">We received a request to reset your password for your Partners + Capital account.</p>
    ${emailButton("Reset Password", resetUrl)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This link expires in 1 hour.</p>
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you didn&rsquo;t request this, you can safely ignore this email. Your password will remain unchanged.</p>`;

  return emailWrapper(content);
}

interface TicketReplyEmailParams {
  userName: string;
  ticketSubject: string;
  replyPreview: string;
  ticketUrl: string;
}

export function ticketReplyEmail({
  userName,
  ticketSubject,
  replyPreview,
  ticketUrl,
}: TicketReplyEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">New Reply on Your Ticket</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">There&rsquo;s a new reply on your support ticket: <strong style="color: #1a1a1a;">${ticketSubject}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="background-color: #faf8f5; border-left: 3px solid #0f1c2e; padding: 16px 20px; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 14px; color: #4a4a4a; line-height: 1.6; font-style: italic;">${replyPreview}</p>
        </td>
      </tr>
    </table>
    ${emailButton("View Ticket", ticketUrl)}`;

  return emailWrapper(content);
}

interface DocumentUploadedEmailParams {
  userName: string;
  documentTitle: string;
  portalUrl: string;
}

export function documentUploadedEmail({
  userName,
  documentTitle,
  portalUrl,
}: DocumentUploadedEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">New Document Available</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">A new document has been added to your portal:</p>
    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a; line-height: 1.5;">${documentTitle}</p>
    ${emailButton("View Documents", portalUrl)}`;

  return emailWrapper(content);
}

interface DistributionNoticeEmailParams {
  userName: string;
  investmentName: string;
  amount: string;
  portalUrl: string;
}

export function distributionNoticeEmail({
  userName,
  investmentName,
  amount,
  portalUrl,
}: DistributionNoticeEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Distribution Notice</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">A distribution of <strong style="color: #1a1a1a;">${amount}</strong> has been recorded for <strong style="color: #1a1a1a;">${investmentName}</strong>.</p>
    ${emailButton("View Details", portalUrl)}`;

  return emailWrapper(content);
}

interface WelcomeEmailParams {
  userName: string;
  loginUrl: string;
}

export function welcomeEmail({
  userName,
  loginUrl,
}: WelcomeEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">Welcome to Partners + Capital</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #4a4a4a; line-height: 1.6;">Your investor portal account has been created. You can now access your portfolio, view documents, and track your investments all in one place.</p>
    ${emailButton("Log In", loginUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you have any questions, reach out to your contact at Partners + Capital.</p>`;

  return emailWrapper(content);
}

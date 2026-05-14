// Branded email templates for Partners + Capital investor portal

import { prisma } from "./prisma";

let cachedLogoUrl: string | null | undefined;
let logoCacheTime = 0;
const LOGO_CACHE_TTL = 60_000; // 1 minute

export async function getEmailLogoUrl(): Promise<string | null> {
  const now = Date.now();
  if (cachedLogoUrl !== undefined && now - logoCacheTime < LOGO_CACHE_TTL) {
    return cachedLogoUrl;
  }
  const org = await prisma.organization.findFirst({ select: { logoUrl: true } });
  cachedLogoUrl = org?.logoUrl ?? null;
  logoCacheTime = now;
  return cachedLogoUrl;
}

function emailWrapper(content: string, logoUrl?: string | null): string {
  const headerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Partners + Capital" style="max-height: 32px; width: auto;" />`
    : `<span style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Partners + Capital</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Partners + Capital</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f3; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1A2640; padding: 28px 40px; text-align: center;">
              ${headerContent}
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
      <td style="background-color: #1A2640; border-radius: 6px;">
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
  logoUrl?: string | null;
}

export function advisorInviteEmail({
  clientName,
  advisorName,
  permissionLevel,
  expiresAt,
  acceptUrl,
  logoUrl,
}: AdvisorInviteEmailParams): string {
  const expiryNote = expiresAt
    ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This invitation expires on ${new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</p>`
    : "";

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Portfolio Access Invitation</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${advisorName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;"><strong style="color: #1a1a18;">${clientName}</strong> has invited you to view their investment portfolio on Partners + Capital.</p>
    <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Your access level</p>
    <p style="margin: 0 0 4px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">${permissionLevel}</p>
    ${emailButton("Accept Invitation", acceptUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you were not expecting this invitation, you can safely ignore this email.</p>
    ${expiryNote}`;

  return emailWrapper(content, logoUrl);
}

interface PasswordResetEmailParams {
  userName: string;
  resetUrl: string;
  logoUrl?: string | null;
}

export function passwordResetEmail({
  userName,
  resetUrl,
  logoUrl,
}: PasswordResetEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Reset Your Password</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">We received a request to reset your password for your Partners + Capital account.</p>
    ${emailButton("Reset Password", resetUrl)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This link expires in 1 hour.</p>
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you didn&rsquo;t request this, you can safely ignore this email. Your password will remain unchanged.</p>`;

  return emailWrapper(content, logoUrl);
}

interface TicketReplyEmailParams {
  userName: string;
  ticketSubject: string;
  replyPreview: string;
  ticketUrl: string;
  logoUrl?: string | null;
}

export function ticketReplyEmail({
  userName,
  ticketSubject,
  replyPreview,
  ticketUrl,
  logoUrl,
}: TicketReplyEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Reply on Your Ticket</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">There&rsquo;s a new reply on your support ticket: <strong style="color: #1a1a18;">${ticketSubject}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="background-color: #f5f5f3; border-left: 3px solid #1A2640; padding: 16px 20px; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 14px; color: #5f5e5a; line-height: 1.6; font-style: italic;">${replyPreview}</p>
        </td>
      </tr>
    </table>
    ${emailButton("View Ticket", ticketUrl)}`;

  return emailWrapper(content, logoUrl);
}

interface DocumentUploadedEmailParams {
  userName: string;
  documentTitle: string;
  portalUrl: string;
  logoUrl?: string | null;
}

export function documentUploadedEmail({
  userName,
  documentTitle,
  portalUrl,
  logoUrl,
}: DocumentUploadedEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Document Available</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">A new document has been added to your portal:</p>
    <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a18; line-height: 1.5;">${documentTitle}</p>
    ${emailButton("View Documents", portalUrl)}`;

  return emailWrapper(content, logoUrl);
}

interface DistributionNoticeEmailParams {
  userName: string;
  investmentName: string;
  amount: string;
  portalUrl: string;
  logoUrl?: string | null;
}

export function distributionNoticeEmail({
  userName,
  investmentName,
  amount,
  portalUrl,
  logoUrl,
}: DistributionNoticeEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Distribution Notice</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">A distribution of <strong style="color: #1a1a18;">${amount}</strong> has been recorded for <strong style="color: #1a1a18;">${investmentName}</strong>.</p>
    ${emailButton("View Details", portalUrl)}`;

  return emailWrapper(content, logoUrl);
}

interface AccessRequestEmailParams {
  name: string;
  email: string;
  phone: string | null;
  logoUrl?: string | null;
}

export function accessRequestEmail({
  name,
  email,
  phone,
  logoUrl,
}: AccessRequestEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Access Request</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">A new access request has been submitted through the investor portal login page.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="background-color: #f5f5f3; padding: 20px; border-radius: 6px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Name</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a;">${name}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Email</p>
          <p style="margin: 0 0 ${phone ? "16px" : "0"} 0; font-size: 15px; color: #5f5e5a;"><a href="mailto:${email}" style="color: #185fa5; text-decoration: none;">${email}</a></p>
          ${phone ? `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Phone</p>
          <p style="margin: 0; font-size: 15px; color: #5f5e5a;">${phone}</p>` : ""}
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">You can review this request in the admin panel under Access Requests.</p>`;

  return emailWrapper(content, logoUrl);
}

interface WelcomeEmailParams {
  userName: string;
  resetUrl: string;
  logoUrl?: string | null;
}

export function welcomeEmail({
  userName,
  resetUrl,
  logoUrl,
}: WelcomeEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Welcome to Partners + Capital</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Your investor portal account has been created by your team at Partners + Capital. To get started, please set your password using the button below.</p>
    ${emailButton("Set Your Password", resetUrl)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This link expires in 1 hour.</p>
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you have any questions, reach out to your contact at Partners + Capital.</p>`;

  return emailWrapper(content, logoUrl);
}

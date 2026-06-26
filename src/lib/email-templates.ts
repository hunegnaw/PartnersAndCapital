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
  let url = org?.logoUrl ?? null;
  // Ensure absolute URL for email clients (relative paths won't resolve)
  if (url && url.startsWith("/")) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    url = `${baseUrl}${url}`;
  }
  cachedLogoUrl = url;
  logoCacheTime = now;
  return cachedLogoUrl;
}

// Placeholder rendered by emailWrapper; replaced with active email disclosures
// (or removed) by injectEmailDisclosures() at send time.
const EMAIL_DISCLOSURES_MARKER = "<!--EMAIL_DISCLOSURES-->";

let cachedEmailDisclosures: { title: string; body: string }[] | undefined;
let emailDisclosuresCacheTime = 0;

async function getEmailDisclosures(): Promise<{ title: string; body: string }[]> {
  const now = Date.now();
  if (cachedEmailDisclosures !== undefined && now - emailDisclosuresCacheTime < LOGO_CACHE_TTL) {
    return cachedEmailDisclosures;
  }
  const rows = await prisma.statementDisclosure.findMany({
    where: { isActive: true, showOnEmails: true },
    orderBy: { sortOrder: "asc" },
    select: { title: true, body: true },
  });
  cachedEmailDisclosures = rows;
  emailDisclosuresCacheTime = now;
  return rows;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replaces the disclosures marker in a wrapped email with the active email
 * disclosures (shown just above the footer), or removes it when there are none.
 * Called by sendEmail() so EVERY outgoing email picks them up. No-op for any
 * email body that doesn't contain the marker.
 */
export async function injectEmailDisclosures(html: string): Promise<string> {
  if (!html.includes(EMAIL_DISCLOSURES_MARKER)) return html;
  const disclosures = await getEmailDisclosures();
  if (disclosures.length === 0) {
    return html.split(EMAIL_DISCLOSURES_MARKER).join("");
  }
  const inner = disclosures
    .map(
      (d) =>
        `<p style="margin: 0 0 8px 0; font-size: 11px; color: #9a9a9a; line-height: 1.5;"><strong style="color: #7a7a7a;">${escapeHtml(d.title)}</strong> ${escapeHtml(d.body).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
  const row = `<tr><td style="padding: 20px 40px; border-top: 1px solid #e8e5e0;">${inner}</td></tr>`;
  return html.split(EMAIL_DISCLOSURES_MARKER).join(row);
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
          <!-- Disclosures (injected at send time, just above the footer) -->
          ${EMAIL_DISCLOSURES_MARKER}
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
  ticketUrl: string;
  logoUrl?: string | null;
}

export function ticketReplyEmail({
  userName,
  ticketSubject,
  ticketUrl,
  logoUrl,
}: TicketReplyEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Reply on Your Ticket</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">There&rsquo;s a new reply on your support ticket: <strong style="color: #1a1a18;">${ticketSubject}</strong></p>
    <p style="margin: 0 0 16px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">For your security, message content is not included in email notifications.</p>
    ${emailButton("View Ticket", ticketUrl)}`;

  return emailWrapper(content, logoUrl);
}

interface TicketSubmittedEmailParams {
  userName: string;
  ticketSubject: string;
  ticketUrl: string;
  logoUrl?: string | null;
}

export function ticketSubmittedEmail({
  userName,
  ticketSubject,
  ticketUrl,
  logoUrl,
}: TicketSubmittedEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Support Ticket Received</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Your support ticket has been received: <strong style="color: #1a1a18;">${ticketSubject}</strong></p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Our team will review your request and respond as soon as possible. You can check the status of your ticket at any time from your portal.</p>
    ${emailButton("View Your Ticket", ticketUrl)}`;

  return emailWrapper(content, logoUrl);
}

interface TicketAdminNotifyEmailParams {
  adminName: string;
  clientName: string;
  ticketSubject: string;
  ticketUrl: string;
  logoUrl?: string | null;
}

export function ticketAdminNotifyEmail({
  adminName,
  clientName,
  ticketSubject,
  ticketUrl,
  logoUrl,
}: TicketAdminNotifyEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Support Ticket</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${adminName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;"><strong style="color: #1a1a18;">${clientName}</strong> has submitted a new support ticket: <strong style="color: #1a1a18;">${ticketSubject}</strong></p>
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
  smsConsent?: boolean;
  logoUrl?: string | null;
}

export function accessRequestEmail({
  name,
  email,
  phone,
  smsConsent,
  logoUrl,
}: AccessRequestEmailParams): string {
  const smsConsentHtml = `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">SMS Consent</p>
          <p style="margin: 0; font-size: 15px; color: ${smsConsent ? "#3b6d11" : "#5f5e5a"};">${smsConsent ? "Opted In \u2713" : "Not opted in"}</p>`;

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Access Request</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">A new access request has been submitted through the investor portal login page.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="background-color: #f5f5f3; padding: 20px; border-radius: 6px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Name</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a;">${name}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Email</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a;"><a href="mailto:${email}" style="color: #185fa5; text-decoration: none;">${email}</a></p>
          ${phone ? `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #1a1a18; text-transform: uppercase; letter-spacing: 0.05em;">Phone</p>
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a;">${phone}</p>` : ""}
          ${smsConsentHtml}
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

interface OnboardingEmailParams {
  userName: string;
  resetUrl: string;
  logoUrl?: string | null;
}

export function onboardingEmail({
  userName,
  resetUrl,
  logoUrl,
}: OnboardingEmailParams): string {
  const stepCircle = (num: number) =>
    `<td style="width: 32px; height: 32px; background-color: #1A2640; border-radius: 50%; text-align: center; vertical-align: middle; color: #ffffff; font-size: 14px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${num}</td>`;

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Welcome to Partners + Capital</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Your investor portal account is ready. Complete these three steps to get started:</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #e8e5e0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            ${stepCircle(1)}
            <td style="padding-left: 14px;">
              <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 600; color: #1a1a18;">Set your password</p>
              <p style="margin: 0; font-size: 13px; color: #5f5e5a;">Use the button below to create a secure password.</p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 0; border-bottom: 1px solid #e8e5e0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            ${stepCircle(2)}
            <td style="padding-left: 14px;">
              <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 600; color: #1a1a18;">Complete identity verification</p>
              <p style="margin: 0; font-size: 13px; color: #5f5e5a;">Provide your legal name, address, and government-issued ID.</p>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            ${stepCircle(3)}
            <td style="padding-left: 14px;">
              <p style="margin: 0 0 2px 0; font-size: 15px; font-weight: 600; color: #1a1a18;">Verify accredited investor status</p>
              <p style="margin: 0; font-size: 13px; color: #5f5e5a;">Upload supporting documentation to confirm your qualification.</p>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>

    ${emailButton("Set Your Password", resetUrl)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This link expires in 24 hours.</p>
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">Verification is required before portfolio access.</p>`;

  return emailWrapper(content, logoUrl);
}

interface VerificationApprovedEmailParams {
  userName: string;
  loginUrl: string;
  logoUrl?: string | null;
}

export function verificationApprovedEmail({
  userName,
  loginUrl,
  logoUrl,
}: VerificationApprovedEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">You&rsquo;re all set.</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Your identity and accreditation verification has been approved. Your portfolio is now ready for you.</p>
    ${emailButton("Log In to Your Portal", loginUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you have any questions, reach out to your contact at Partners + Capital.</p>`;

  return emailWrapper(content, logoUrl);
}

interface VerificationSubmittedEmailParams {
  clientName: string;
  clientEmail: string;
  verificationUrl: string;
  logoUrl?: string | null;
}

export function verificationSubmittedEmail({
  clientName,
  clientEmail,
  verificationUrl,
  logoUrl,
}: VerificationSubmittedEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Verification Pending Review</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;"><strong>${clientName}</strong> (${clientEmail}) has completed their identity and accreditation verification and is awaiting review.</p>
    ${emailButton("Review Verification", verificationUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">Please review and approve or reject to grant portal access.</p>`;

  return emailWrapper(content, logoUrl);
}

interface SecureMessageEmailParams {
  userName: string;
  loginUrl: string;
  logoUrl?: string | null;
}

export function secureMessageEmail({
  userName,
  loginUrl,
  logoUrl,
}: SecureMessageEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">New Secure Message</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">A new secure message is waiting for you in your Partners + Capital portal.</p>
    <p style="margin: 0 0 16px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">For your security, message content is not included in email notifications.</p>
    ${emailButton("Log In to Read Message", loginUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you did not expect this message, you can safely ignore this email.</p>`;

  return emailWrapper(content, logoUrl);
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
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">After setting your password, you&rsquo;ll need to complete a short identity and accreditation verification before accessing your portfolio.</p>
    ${emailButton("Set Your Password", resetUrl)}
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">This link expires in 1 hour.</p>
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">If you have any questions, reach out to your contact at Partners + Capital.</p>`;

  return emailWrapper(content, logoUrl);
}

// ─── Statement Email Templates ──────────────────────────────────────

interface StatementReadyEmailParams {
  userName: string;
  periodLabel: string;
  portalUrl: string;
  orgEmail?: string | null;
  orgPhone?: string | null;
  logoUrl?: string | null;
}

export function statementReadyEmail({
  userName,
  periodLabel,
  portalUrl,
  orgEmail,
  orgPhone,
  logoUrl,
}: StatementReadyEmailParams): string {
  const contactLine = [orgEmail, orgPhone].filter(Boolean).join(" or ");
  const contactHtml = contactLine
    ? `<p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">If you have questions about your statement, please contact us at ${contactLine}.</p>`
    : "";

  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">Your ${periodLabel} Statement is Ready</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${userName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Your investment statement for ${periodLabel} is now available in your portal.</p>
    ${emailButton("View Statement", portalUrl)}
    ${contactHtml}`;

  return emailWrapper(content, logoUrl);
}

interface StatementsGeneratedEmailParams {
  adminName: string;
  count: number;
  periodLabel: string;
  reviewUrl: string;
  logoUrl?: string | null;
}

export function statementsGeneratedEmail({
  adminName,
  count,
  periodLabel,
  reviewUrl,
  logoUrl,
}: StatementsGeneratedEmailParams): string {
  const content = `
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #1a1a18; line-height: 1.3;">${count} Client Statement${count !== 1 ? "s" : ""} Generated</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;">Hello ${adminName},</p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #5f5e5a; line-height: 1.6;"><strong style="color: #1a1a18;">${count}</strong> client statement${count !== 1 ? "s" : ""} for <strong style="color: #1a1a18;">${periodLabel}</strong> have been generated and are ready for your review.</p>
    ${emailButton("Review Statements", reviewUrl)}
    <p style="margin: 0; font-size: 13px; color: #9a9a9a; line-height: 1.5;">Statements will not be visible to clients until you approve them.</p>`;

  return emailWrapper(content, logoUrl);
}

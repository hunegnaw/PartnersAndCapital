import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { accessRequestEmail, onboardingEmail, getEmailLogoUrl } from "@/lib/email-templates";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const accessRequestLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    const rateLimit = accessRequestLimiter(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { name, email, phone, smsConsent } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (anti-enumeration: always return success)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // User exists — just create access request for admin tracking + notify admin
      await prisma.accessRequest.create({
        data: {
          name,
          email: normalizedEmail,
          phone: phone || null,
          smsConsent: smsConsent === true,
          ipAddress: ip,
        },
      });

      // Fire-and-forget admin notification
      try {
        getEmailLogoUrl().then((logoUrl) => {
          sendEmail({
            to: "theteam@partnersandcapital.com",
            subject: `New Access Request from ${name}`,
            html: accessRequestEmail({ name, email: normalizedEmail, phone: phone || null, smsConsent: smsConsent === true, logoUrl }),
          }).catch(console.error);
        });
      } catch {
        // best-effort
      }

      return NextResponse.json({ success: true });
    }

    // New user — create account, verification, password reset token, and access request
    const tempPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    const resetToken = crypto.randomBytes(32).toString("hex");

    await prisma.$transaction(async (tx) => {
      // Create user with PENDING status
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name,
          password: tempPassword,
          role: "CLIENT",
          accountStatus: "PENDING",
          phone: phone || null,
        },
      });

      // Create verification record (NOT_STARTED)
      await tx.verification.create({
        data: {
          userId: user.id,
          status: "NOT_STARTED",
        },
      });

      // Delete any existing password reset tokens for this email
      await tx.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      });

      // Create 24-hour password reset token (stored plaintext, matching forgot-password pattern)
      await tx.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token: resetToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Create access request record for admin tracking
      await tx.accessRequest.create({
        data: {
          name,
          email: normalizedEmail,
          phone: phone || null,
          smsConsent: smsConsent === true,
          ipAddress: ip,
        },
      });
    });

    // Fire-and-forget: send onboarding email to user + admin notification
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    try {
      getEmailLogoUrl().then((logoUrl) => {
        // Onboarding email to new user
        sendEmail({
          to: normalizedEmail,
          subject: "Welcome to Partners + Capital \u2014 Complete Your Setup",
          html: onboardingEmail({ userName: name, resetUrl, logoUrl }),
        }).catch(console.error);

        // Admin notification
        sendEmail({
          to: "theteam@partnersandcapital.com",
          subject: `New Access Request from ${name}`,
          html: accessRequestEmail({ name, email: normalizedEmail, phone: phone || null, smsConsent: smsConsent === true, logoUrl }),
        }).catch(console.error);
      });
    } catch {
      // best-effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Access request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

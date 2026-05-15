import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { accessRequestEmail, getEmailLogoUrl } from "@/lib/email-templates";

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

    await prisma.accessRequest.create({
      data: {
        name,
        email,
        phone: phone || null,
        smsConsent: smsConsent === true,
        ipAddress: ip,
      },
    });

    // Fire-and-forget email notification
    try {
      getEmailLogoUrl().then((logoUrl) => {
        sendEmail({
          to: "theteam@partnersandcapital.com",
          subject: `New Access Request from ${name}`,
          html: accessRequestEmail({ name, email, phone: phone || null, smsConsent: smsConsent === true, logoUrl }),
        }).catch(console.error);
      });
    } catch {
      // Email notification is best-effort
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

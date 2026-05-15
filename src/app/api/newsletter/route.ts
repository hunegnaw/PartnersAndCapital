import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const newsletterLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    const rateLimit = newsletterLimiter(ip);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {
        unsubscribedAt: null,
        subscribedAt: new Date(),
      },
      create: {
        email,
      },
    });

    // Add to Brevo newsletter list (fire-and-forget)
    const brevoApiKey = process.env.BREVO_API_KEY;
    const brevoListId = parseInt(process.env.BREVO_NEWSLETTER_LIST_ID || "2", 10);
    if (brevoApiKey) {
      fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          listIds: [brevoListId],
          updateEnabled: true,
        }),
      }).catch((err) => console.error("Brevo API error:", err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireClient } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createBulkNotifications } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { verificationSubmittedEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function POST(request: Request) {
  try {
    const user = await requireClient();
    if (user instanceof NextResponse) return user;

    const verification = await prisma.verification.findUnique({
      where: { userId: user.id },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "No verification record found" },
        { status: 404 }
      );
    }

    if (verification.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Verification already submitted" },
        { status: 400 }
      );
    }

    if (verification.status === "APPROVED") {
      return NextResponse.json(
        { error: "Verification already approved" },
        { status: 400 }
      );
    }

    // Validate required fields
    const missing: string[] = [];
    if (!verification.legalFirstName) missing.push("Legal first name");
    if (!verification.legalLastName) missing.push("Legal last name");
    if (!verification.country) missing.push("Country");
    if (!verification.address) missing.push("Address");
    if (!verification.city) missing.push("City");
    if (!verification.zipCode) missing.push("ZIP code");
    if (!verification.idDocumentType) missing.push("ID document type");
    if (!verification.idDocumentPath) missing.push("ID document");
    if (!verification.accreditationBasis) missing.push("Accreditation basis");
    if (!verification.accreditationDocPath)
      missing.push("Accreditation document");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse consent from request body
    const body = await request.json();
    const { consentAccuracy, consentDataHandling, consentScreening } = body;

    if (!consentAccuracy || !consentDataHandling || !consentScreening) {
      return NextResponse.json(
        { error: "All consent checkboxes must be accepted" },
        { status: 400 }
      );
    }

    await prisma.verification.update({
      where: { userId: user.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        consentAccuracy: true,
        consentDataHandling: true,
        consentScreening: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "VERIFICATION_SUBMITTED",
      targetType: "Verification",
      targetId: verification.id,
      request,
    });

    // Notify admins via in-app notification
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (admins.length > 0) {
      createBulkNotifications(
        admins.map((a) => a.id),
        {
          type: "SYSTEM_MESSAGE",
          title: "New Verification Submitted",
          message: `${user.name || user.email} has submitted their KYC verification for review.`,
          link: `/admin/verifications/${verification.id}`,
        }
      ).catch(console.error);
    }

    // Send email to P+C about pending verification
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/admin/verifications/${verification.id}`;

    try {
      getEmailLogoUrl().then((logoUrl) => {
        sendEmail({
          to: "theteam@partnersandcapital.com",
          subject: `Verification Pending: ${user.name || user.email}`,
          html: verificationSubmittedEmail({
            clientName: user.name || "Client",
            clientEmail: user.email,
            verificationUrl,
            logoUrl,
          }),
        }).catch(console.error);
      });
    } catch {
      // best-effort
    }

    return NextResponse.json({ status: "SUBMITTED" });
  } catch (error) {
    console.error("Error submitting verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

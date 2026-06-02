import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const client = await prisma.user.findFirst({
      where: { id, role: "CLIENT", deletedAt: null },
      include: { verification: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    if (client.verification?.status === "APPROVED") {
      return NextResponse.json(
        { error: "Client KYC is already approved" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (client.verification) {
        await tx.verification.update({
          where: { id: client.verification.id },
          data: {
            status: "APPROVED",
            reviewedById: admin.id,
            reviewedAt: new Date(),
            reviewNotes: "Manually approved by admin",
          },
        });
      } else {
        await tx.verification.create({
          data: {
            userId: id,
            status: "APPROVED",
            reviewedById: admin.id,
            reviewedAt: new Date(),
            reviewNotes: "Manually approved by admin",
            consentAccuracy: true,
            consentDataHandling: true,
            consentScreening: true,
          },
        });
      }

      await tx.user.update({
        where: { id },
        data: { accountStatus: "ACTIVE" },
      });
    });

    await createAuditLog({
      userId: admin.id,
      action: "VERIFICATION_APPROVED",
      targetType: "User",
      targetId: id,
      details: { manual: true },
      request,
    });

    await createNotification({
      userId: id,
      type: "SYSTEM_MESSAGE",
      title: "Verification Approved",
      message:
        "Your identity and accreditation verification has been approved. You now have full portal access.",
      link: "/dashboard",
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error approving KYC:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

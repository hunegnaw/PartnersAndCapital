import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { statementReadyEmail, getEmailLogoUrl } from "@/lib/email-templates";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const statement = await prisma.statement.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    if (statement.status !== "GENERATED") {
      return NextResponse.json(
        { error: `Cannot approve statement with status ${statement.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.statement.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: admin.id,
      },
    });

    await createAuditLog({
      userId: admin.id,
      action: "APPROVE_STATEMENT",
      targetType: "Statement",
      targetId: id,
      details: {
        clientUserId: statement.userId,
        period: statement.statementDate,
      },
      request,
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = await getEmailLogoUrl();
    const org = await prisma.organization.findFirst({
      select: { email: true, phone: true },
    });

    const periodLabel = `${MONTH_NAMES[statement.periodStart.getMonth()]} ${statement.periodStart.getFullYear()}`;

    try {
      await sendEmail({
        to: statement.user.email,
        subject: `Your ${periodLabel} Statement is Ready`,
        html: statementReadyEmail({
          userName: statement.user.name || statement.user.email,
          periodLabel,
          portalUrl: `${baseUrl}/documents?tab=statements`,
          orgEmail: org?.email,
          orgPhone: org?.phone,
          logoUrl,
        }),
      });

      await prisma.statement.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch {
      console.error(`Failed to send statement email to ${statement.user.email}`);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error approving statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

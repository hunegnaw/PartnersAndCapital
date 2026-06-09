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

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { statementIds } = body as { statementIds: string[] };

    if (!statementIds || statementIds.length === 0) {
      return NextResponse.json({ error: "statementIds required" }, { status: 400 });
    }

    const statements = await prisma.statement.findMany({
      where: { id: { in: statementIds }, status: "GENERATED" },
      include: { user: { select: { name: true, email: true } } },
    });

    await prisma.statement.updateMany({
      where: { id: { in: statements.map((s) => s.id) } },
      data: { status: "APPROVED", approvedAt: new Date(), approvedBy: admin.id },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = await getEmailLogoUrl();
    const org = await prisma.organization.findFirst({
      select: { email: true, phone: true },
    });

    let sentCount = 0;
    for (const s of statements) {
      const periodLabel = `${MONTH_NAMES[s.periodStart.getMonth()]} ${s.periodStart.getFullYear()}`;
      try {
        await sendEmail({
          to: s.user.email,
          subject: `Your ${periodLabel} Statement is Ready`,
          html: statementReadyEmail({
            userName: s.user.name || s.user.email,
            periodLabel,
            portalUrl: `${baseUrl}/documents?tab=statements`,
            orgEmail: org?.email,
            orgPhone: org?.phone,
            logoUrl,
          }),
        });
        await prisma.statement.update({
          where: { id: s.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        sentCount++;
      } catch {
        console.error(`Failed to send statement email to ${s.user.email}`);
      }
    }

    await createAuditLog({
      userId: admin.id,
      action: "BULK_APPROVE_STATEMENTS",
      targetType: "Statement",
      details: {
        count: statements.length,
        sent: sentCount,
        statementIds: statements.map((s) => s.id),
      },
      request,
    });

    return NextResponse.json({ approved: statements.length, sent: sentCount });
  } catch (error) {
    console.error("Error bulk approving statements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

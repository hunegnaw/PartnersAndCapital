import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateBatchStatements } from "@/lib/statement-pdf";
import { sendEmail } from "@/lib/email";
import { statementsGeneratedEmail, getEmailLogoUrl } from "@/lib/email-templates";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { month, year, clientIds, monthToDate } = body as {
      month: number;
      year: number;
      clientIds?: string[];
      monthToDate?: boolean;
    };

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const periodStart = new Date(year, month - 1, 1);
    let periodEnd: Date;

    if (monthToDate) {
      const now = new Date();
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      periodEnd = new Date(year, month, 0);
    }

    let userIds: string[];
    if (clientIds && clientIds.length > 0) {
      userIds = clientIds;
    } else {
      const clients = await prisma.user.findMany({
        where: {
          role: "CLIENT",
          deletedAt: null,
          accountStatus: "ACTIVE",
          clientInvestments: { some: { deletedAt: null } },
        },
        select: { id: true },
      });
      userIds = clients.map((c) => c.id);
    }

    if (userIds.length === 0) {
      return NextResponse.json({ error: "No eligible clients found" }, { status: 400 });
    }

    const result = await generateBatchStatements(userIds, periodStart, periodEnd, admin.id, request);

    const org = await prisma.organization.findFirst({
      select: { email: true, name: true },
    });

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const periodLabel = `${monthNames[month - 1]} ${year}`;
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = await getEmailLogoUrl();

    if (org?.email) {
      try {
        await sendEmail({
          to: org.email,
          subject: `${result.success} Client Statements Generated — Pending Approval`,
          html: statementsGeneratedEmail({
            adminName: org.name || "Admin",
            count: result.success,
            periodLabel,
            reviewUrl: `${baseUrl}/admin/statements?status=GENERATED&year=${year}&month=${month}`,
            logoUrl,
          }),
        });
      } catch {
        console.error(`Failed to send admin notification to ${org.email}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating statements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

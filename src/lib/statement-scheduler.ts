import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { generateBatchStatements } from "@/lib/statement-pdf";
import { getNextBusinessDay, isSameDay } from "@/lib/business-days";
import { sendEmail } from "@/lib/email";
import { statementsGeneratedEmail, getEmailLogoUrl } from "@/lib/email-templates";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

let schedulerStarted = false;

export function startStatementScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run at 6:00 AM on the 1st through 4th of every month
  cron.schedule("0 6 1-4 * *", async () => {
    try {
      const today = new Date();
      const targetDate = new Date(today.getFullYear(), today.getMonth(), 2);
      const businessDay = await getNextBusinessDay(targetDate);

      if (!isSameDay(today, businessDay)) return;

      console.log("[Statement Scheduler] Running monthly statement generation...");

      const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

      const clients = await prisma.user.findMany({
        where: {
          role: "CLIENT",
          deletedAt: null,
          accountStatus: "ACTIVE",
          clientInvestments: { some: { deletedAt: null } },
        },
        select: { id: true },
      });

      if (clients.length === 0) {
        console.log("[Statement Scheduler] No eligible clients found.");
        return;
      }

      const userIds = clients.map((c) => c.id);
      const result = await generateBatchStatements(userIds, previousMonth, previousMonthEnd);

      console.log(
        `[Statement Scheduler] Generated ${result.success}/${result.total} statements (${result.failed} failed)`
      );

      const admins = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null },
        select: { email: true, name: true },
      });

      const periodLabel = `${MONTH_NAMES[previousMonth.getMonth()]} ${previousMonth.getFullYear()}`;
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const logoUrl = await getEmailLogoUrl();
      const month = previousMonth.getMonth() + 1;
      const year = previousMonth.getFullYear();

      for (const admin of admins) {
        try {
          await sendEmail({
            to: admin.email,
            subject: `${result.success} Client Statements Generated — Pending Approval`,
            html: statementsGeneratedEmail({
              adminName: admin.name || "Admin",
              count: result.success,
              periodLabel,
              reviewUrl: `${baseUrl}/admin/statements?status=GENERATED&year=${year}&month=${month}`,
              logoUrl,
            }),
          });
        } catch {
          console.error(`[Statement Scheduler] Failed to notify ${admin.email}`);
        }
      }
    } catch (error) {
      console.error("[Statement Scheduler] Error:", error);
    }
  });

  console.log("[Statement Scheduler] Cron job registered: 6:00 AM on 1st-4th of each month");
}

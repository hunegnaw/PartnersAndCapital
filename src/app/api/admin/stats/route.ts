import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      newClientsThisMonth,
      activeInvestments,
      aumResult,
      totalDocuments,
      pendingAdvisors,
      recentAuditLogs,
      pendingSetupClients,
      latestAuditEntry,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "CLIENT", deletedAt: null },
      }),
      prisma.user.count({
        where: {
          role: "CLIENT",
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.investment.count({
        where: { status: "ACTIVE", deletedAt: null },
      }),
      prisma.clientInvestment.aggregate({
        _sum: { currentValue: true },
        where: { deletedAt: null },
      }),
      prisma.document.count({
        where: { deletedAt: null },
      }),
      prisma.advisor.count({
        where: { status: "PENDING" },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // Clients without any investments (pending setup)
      prisma.user.count({
        where: {
          role: "CLIENT",
          deletedAt: null,
          clientInvestments: { none: {} },
        },
      }),
      prisma.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          action: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    // Clients with active portals (have at least one investment)
    const activePortals = totalClients - pendingSetupClients;

    return NextResponse.json({
      totalClients,
      newClientsThisMonth,
      activeInvestments,
      totalAUM: Number(aumResult._sum.currentValue ?? 0),
      totalDocuments,
      pendingAdvisors,
      recentAuditLogs,
      pendingSetupClients,
      activePortals,
      latestAuditEntry: latestAuditEntry
        ? {
            action: latestAuditEntry.action,
            createdAt: latestAuditEntry.createdAt.toISOString(),
            userName: latestAuditEntry.user?.name || "System",
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

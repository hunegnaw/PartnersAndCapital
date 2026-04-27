import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const [
      totalClients,
      activeInvestments,
      aumResult,
      totalDocuments,
      pendingAdvisors,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "CLIENT", deletedAt: null },
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
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalClients,
      activeInvestments,
      totalAUM: aumResult._sum.currentValue ?? 0,
      totalDocuments,
      pendingAdvisors,
      recentAuditLogs,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

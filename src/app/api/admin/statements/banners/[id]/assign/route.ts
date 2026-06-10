import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id: bannerId } = await params;
    const body = await request.json();
    const { months, years, clientIds, allClients } = body as {
      months: number[];
      years: number[];
      clientIds?: string[];
      allClients?: boolean;
    };

    if (!months?.length || !years?.length) {
      return NextResponse.json({ error: "months and years are required" }, { status: 400 });
    }

    const banner = await prisma.statementBanner.findUnique({ where: { id: bannerId } });
    if (!banner || banner.deletedAt) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    const assignments: { bannerId: string; userId: string | null; month: number; year: number }[] = [];

    for (const year of years) {
      for (const month of months) {
        if (allClients) {
          assignments.push({ bannerId, userId: null, month, year });
        } else if (clientIds?.length) {
          for (const userId of clientIds) {
            assignments.push({ bannerId, userId, month, year });
          }
        }
      }
    }

    let created = 0;
    for (const a of assignments) {
      const existing = await prisma.statementBannerAssignment.findFirst({
        where: {
          bannerId: a.bannerId,
          userId: a.userId,
          month: a.month,
          year: a.year,
        },
      });
      if (!existing) {
        await prisma.statementBannerAssignment.create({ data: a });
        created++;
      }
    }

    await createAuditLog({
      userId: admin.id,
      action: "ASSIGN_BANNER",
      targetType: "StatementBanner",
      targetId: bannerId,
      details: {
        months,
        years,
        allClients: !!allClients,
        clientCount: allClients ? "all" : clientIds?.length,
        assignmentsCreated: created,
      },
      request,
    });

    return NextResponse.json({ created });
  } catch (error) {
    console.error("Error assigning banner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

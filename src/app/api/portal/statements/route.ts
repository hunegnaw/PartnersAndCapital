import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/impersonation";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { userId } = await getEffectiveUserId();

    const statements = await prisma.statement.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ["APPROVED", "SENT"] },
      },
      select: {
        id: true,
        statementDate: true,
        periodStart: true,
        periodEnd: true,
        fileName: true,
        fileSize: true,
        totalInvested: true,
        currentValue: true,
        totalDistributions: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: { periodStart: "desc" },
    });

    return NextResponse.json(
      statements.map((s) => ({
        ...s,
        totalInvested: Number(s.totalInvested),
        currentValue: Number(s.currentValue),
        totalDistributions: Number(s.totalDistributions),
      }))
    );
  } catch (error) {
    console.error("Error fetching client statements:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

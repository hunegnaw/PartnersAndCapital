import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: Record<string, unknown> = {};
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);

    const distributions = await prisma.statementUpcomingDistribution.findMany({
      where,
      include: { investment: { select: { id: true, name: true } } },
      orderBy: [{ expectedDate: "asc" }],
    });

    return NextResponse.json(distributions.map((d) => ({
      ...d,
      amount: d.amount ? Number(d.amount) : null,
    })));
  } catch (error) {
    console.error("Error fetching upcoming distributions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { investmentId, expectedDate, amount, description, month, year } = body;

    if (!investmentId || !expectedDate || !month || !year) {
      return NextResponse.json({ error: "investmentId, expectedDate, month, and year are required" }, { status: 400 });
    }

    const dist = await prisma.statementUpcomingDistribution.create({
      data: {
        investmentId,
        expectedDate: new Date(expectedDate + "T12:00:00"),
        amount: amount || null,
        description: description || null,
        month,
        year,
      },
    });

    return NextResponse.json(dist);
  } catch (error) {
    console.error("Error creating upcoming distribution:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

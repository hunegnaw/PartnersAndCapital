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

    const commentaries = await prisma.statementCommentary.findMany({
      where,
      include: { investment: { select: { id: true, name: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json(commentaries);
  } catch (error) {
    console.error("Error fetching commentaries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { investmentId, month, year, title, body: commentBody } = body;

    if (!investmentId || !month || !year || !commentBody) {
      return NextResponse.json({ error: "investmentId, month, year, and body are required" }, { status: 400 });
    }

    const commentary = await prisma.statementCommentary.upsert({
      where: { investmentId_month_year: { investmentId, month, year } },
      update: { title: title || null, body: commentBody },
      create: { investmentId, month, year, title: title || null, body: commentBody },
    });

    return NextResponse.json(commentary);
  } catch (error) {
    console.error("Error saving commentary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// Firm-wide "note to all partners" commentary for a period. One entry per
// month/year; appears on every client's statement above the per-investment
// commentary.

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const commentary = await prisma.statementGeneralCommentary.findUnique({
      where: { month_year: { month: parseInt(month, 10), year: parseInt(year, 10) } },
    });

    return NextResponse.json(commentary);
  } catch (error) {
    console.error("Error fetching general commentary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { month, year, title, body: commentBody } = body;

    if (!month || !year || !commentBody) {
      return NextResponse.json({ error: "month, year, and body are required" }, { status: 400 });
    }

    const commentary = await prisma.statementGeneralCommentary.upsert({
      where: { month_year: { month, year } },
      update: { title: title || null, body: commentBody },
      create: { month, year, title: title || null, body: commentBody },
    });

    return NextResponse.json(commentary);
  } catch (error) {
    console.error("Error saving general commentary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    await prisma.statementGeneralCommentary.deleteMany({
      where: { month: parseInt(month, 10), year: parseInt(year, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting general commentary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { generateStatement } from "@/lib/statement-pdf";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const statement = await prisma.statement.findUnique({ where: { id } });

    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    await prisma.statement.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    const result = await generateStatement(
      statement.userId,
      statement.periodStart,
      statement.periodEnd,
      admin.id,
      request
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error regenerating statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

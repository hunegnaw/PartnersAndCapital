import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    const { id } = await params;
    const body = await request.json();
    const dist = await prisma.statementUpcomingDistribution.update({
      where: { id },
      data: {
        expectedDate: body.expectedDate ? new Date(body.expectedDate + "T12:00:00") : undefined,
        amount: body.amount !== undefined ? body.amount : undefined,
        description: body.description !== undefined ? body.description : undefined,
      },
    });
    return NextResponse.json(dist);
  } catch (error) {
    console.error("Error updating upcoming distribution:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    const { id } = await params;
    await prisma.statementUpcomingDistribution.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting upcoming distribution:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

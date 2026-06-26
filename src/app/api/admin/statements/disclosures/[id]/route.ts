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

    const disclosure = await prisma.statementDisclosure.update({
      where: { id },
      data: {
        title: body.title,
        body: body.body,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        showOnStatements: body.showOnStatements,
        showOnEmails: body.showOnEmails,
      },
    });

    return NextResponse.json(disclosure);
  } catch (error) {
    console.error("Error updating disclosure:", error);
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

    await prisma.statementDisclosure.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting disclosure:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

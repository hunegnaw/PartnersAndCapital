import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify investment exists
    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const updates = await prisma.dealRoomUpdate.findMany({
      where: { investmentId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(updates);
  } catch (error) {
    console.error("Error listing deal room updates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Verify investment exists
    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const update = await prisma.dealRoomUpdate.create({
      data: {
        investmentId: id,
        title,
        content,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_DEAL_ROOM_UPDATE",
      targetType: "DealRoomUpdate",
      targetId: update.id,
      details: { investmentId: id, title },
      request,
    });

    return NextResponse.json(update, { status: 201 });
  } catch (error) {
    console.error("Error creating deal room update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const banner = await prisma.statementBanner.findUnique({
      where: { id },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
        placements: {
          include: {
            statement: {
              select: {
                id: true,
                statementDate: true,
                status: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!banner || banner.deletedAt) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error("Error fetching banner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await request.json();

    const banner = await prisma.statementBanner.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        buttonText: body.buttonText,
        buttonUrl: body.buttonUrl,
        gradientFrom: body.gradientFrom,
        gradientTo: body.gradientTo,
        isArchived: body.isArchived,
      },
    });

    await createAuditLog({
      userId: admin.id,
      action: "UPDATE_BANNER",
      targetType: "StatementBanner",
      targetId: id,
      details: { title: banner.title },
      request,
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    await prisma.statementBanner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: admin.id,
      action: "DELETE_BANNER",
      targetType: "StatementBanner",
      targetId: id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

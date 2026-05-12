import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const docType = await prisma.documentType.findUnique({
      where: { id },
    });

    if (!docType) {
      return NextResponse.json(
        { error: "Document type not found" },
        { status: 404 }
      );
    }

    // Check if any documents use this type
    const documentsUsingType = await prisma.document.findMany({
      where: { type: docType.value, deletedAt: null },
      select: {
        id: true,
        name: true,
        user: { select: { id: true, name: true } },
        investment: { select: { id: true, name: true } },
      },
      take: 50,
    });

    const totalCount = await prisma.document.count({
      where: { type: docType.value, deletedAt: null },
    });

    if (totalCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${docType.label}" — ${totalCount} document${totalCount !== 1 ? "s" : ""} use this type. Change their document type first, then return to delete.`,
          documents: documentsUsingType,
          totalCount,
        },
        { status: 409 }
      );
    }

    await prisma.documentType.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

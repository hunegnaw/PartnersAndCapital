import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { deleteUploadedFile } from "@/lib/upload";
import { DocumentType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true, company: true },
        },
        investment: {
          select: { id: true, name: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.document.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const { name, type, year, description, advisorVisible } = body;

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type: type as DocumentType }),
        ...(year !== undefined && { year: year !== null ? parseInt(year) : null }),
        ...(description !== undefined && { description }),
        ...(advisorVisible !== undefined && { advisorVisible }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        investment: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_DOCUMENT",
      targetType: "Document",
      targetId: id,
      details: { name, type, year, description, advisorVisible },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const existing = await prisma.document.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Soft delete the record
    await prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Delete the encrypted file from disk
    await deleteUploadedFile(existing.filePath);

    await createAuditLog({
      userId: user.id,
      action: "DELETE_DOCUMENT",
      targetType: "Document",
      targetId: id,
      details: { name: existing.name, fileName: existing.fileName },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

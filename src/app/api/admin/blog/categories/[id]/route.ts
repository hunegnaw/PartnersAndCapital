import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { name, slug, color, sortOrder } = body;

    const existing = await prisma.blogCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check uniqueness if changing name or slug
    if ((name && name !== existing.name) || (slug && slug !== existing.slug)) {
      const conflict = await prisma.blogCategory.findFirst({
        where: {
          id: { not: id },
          deletedAt: null,
          OR: [
            ...(name && name !== existing.name ? [{ name }] : []),
            ...(slug && slug !== existing.slug ? [{ slug }] : []),
          ],
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A category with this name or slug already exists" },
          { status: 409 }
        );
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(color !== undefined && { color: color || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    createAuditLog({
      userId: user.id,
      action: "UPDATE_BLOG_CATEGORY",
      targetType: "BlogCategory",
      targetId: id,
      details: { name: name || existing.name, slug: slug || existing.slug },
      request,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating blog category:", error);
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

    const existing = await prisma.blogCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    await prisma.blogCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    createAuditLog({
      userId: user.id,
      action: "DELETE_BLOG_CATEGORY",
      targetType: "BlogCategory",
      targetId: id,
      details: { name: existing.name, slug: existing.slug },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { name, slug, color } = body;

    const existing = await prisma.blogTag.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Check uniqueness if changing name or slug
    if ((name && name !== existing.name) || (slug && slug !== existing.slug)) {
      const conflict = await prisma.blogTag.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(name && name !== existing.name ? [{ name }] : []),
            ...(slug && slug !== existing.slug ? [{ slug }] : []),
          ],
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "A tag with this name or slug already exists" },
          { status: 409 }
        );
      }
    }

    const tag = await prisma.blogTag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(color !== undefined && { color: color || null }),
      },
    });

    createAuditLog({
      userId: user.id,
      action: "UPDATE_BLOG_TAG",
      targetType: "BlogTag",
      targetId: id,
      details: { name: name || existing.name, slug: slug || existing.slug },
      request,
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error updating blog tag:", error);
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

    const existing = await prisma.blogTag.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Hard delete for tags (no deletedAt field on BlogTag)
    await prisma.blogPostTag.deleteMany({ where: { tagId: id } });
    await prisma.blogTag.delete({ where: { id } });

    createAuditLog({
      userId: user.id,
      action: "DELETE_BLOG_TAG",
      targetType: "BlogTag",
      targetId: id,
      details: { name: existing.name, slug: existing.slug },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

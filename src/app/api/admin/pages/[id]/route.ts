import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { PageStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const page = await prisma.page.findFirst({
      where: { id, deletedAt: null },
      include: {
        blocks: {
          orderBy: { sortOrder: "asc" },
          include: { media: true },
        },
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error fetching page:", error);
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
    const {
      title,
      slug,
      status,
      isHomepage,
      showInNav,
      navLabel,
      navOrder,
      isBlogPage,
      featuredImageUrl,
      metaTitle,
      metaDescription,
      ogImageUrl,
      blocks,
    } = body;

    const existing = await prisma.page.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    // Check slug uniqueness if changing slug
    if (slug && slug !== existing.slug) {
      const slugTaken = await prisma.page.findFirst({
        where: { slug, deletedAt: null, id: { not: id } },
      });
      if (slugTaken) {
        return NextResponse.json(
          { error: "A page with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If this page is becoming the homepage, unset any existing homepage (excluding this page)
      if (isHomepage) {
        await tx.page.updateMany({
          where: { isHomepage: true, id: { not: id } },
          data: { isHomepage: false },
        });
      }

      // If this page is becoming the blog page, unset any existing blog page (excluding this page)
      if (isBlogPage) {
        await tx.page.updateMany({
          where: { isBlogPage: true, id: { not: id } },
          data: { isBlogPage: false },
        });
      }

      // Update page metadata
      await tx.page.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(slug !== undefined && { slug }),
          ...(status !== undefined && Object.values(PageStatus).includes(status)
            ? { status: status as PageStatus }
            : {}),
          ...(isHomepage !== undefined && { isHomepage }),
          ...(showInNav !== undefined && { showInNav }),
          ...(navLabel !== undefined && { navLabel }),
          ...(navOrder !== undefined && { navOrder }),
          ...(isBlogPage !== undefined && { isBlogPage }),
          ...(featuredImageUrl !== undefined && { featuredImageUrl }),
          ...(metaTitle !== undefined && { metaTitle }),
          ...(metaDescription !== undefined && { metaDescription }),
          ...(ogImageUrl !== undefined && { ogImageUrl }),
        },
      });

      // Replace blocks if provided
      if (blocks !== undefined && Array.isArray(blocks)) {
        // Delete all existing blocks for this page
        await tx.pageBlock.deleteMany({
          where: { pageId: id },
        });

        // Create new blocks
        if (blocks.length > 0) {
          await tx.pageBlock.createMany({
            data: blocks.map(
              (block: {
                type: string;
                props: Record<string, unknown>;
                sortOrder: number;
                mediaId?: string;
              }) => ({
                pageId: id,
                type: block.type,
                props: block.props as object,
                sortOrder: block.sortOrder,
                mediaId: block.mediaId || null,
              })
            ),
          });
        }
      }

      // Return the full page with blocks
      return tx.page.findUnique({
        where: { id },
        include: {
          blocks: {
            orderBy: { sortOrder: "asc" },
            include: { media: true },
          },
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_PAGE",
      targetType: "Page",
      targetId: id,
      details: { title, slug, status, isHomepage, showInNav, isBlogPage, blocksCount: blocks?.length },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating page:", error);
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

    const existing = await prisma.page.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      );
    }

    await prisma.page.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_PAGE",
      targetType: "Page",
      targetId: id,
      details: { title: existing.title, slug: existing.slug },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

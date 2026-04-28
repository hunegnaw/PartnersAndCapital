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

    const post = await prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
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
      content,
      excerpt,
      heroImageUrl,
      categoryId,
      metaTitle,
      metaDescription,
      ogImageUrl,
      isPublished,
      tags,
    } = body;

    const existing = await prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    // Check slug uniqueness if changing
    if (slug && slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findUnique({ where: { slug } });
      if (slugTaken) {
        return NextResponse.json(
          { error: "A post with this slug already exists" },
          { status: 409 }
        );
      }
    }

    // Calculate read time if content is being updated
    let readTime: number | undefined;
    if (content !== undefined) {
      const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
      readTime = Math.max(1, Math.ceil(wordCount / 200));
    }

    // Determine publishedAt: set if switching from draft to published
    let publishedAt: Date | undefined;
    if (isPublished === true && !existing.isPublished && !existing.publishedAt) {
      publishedAt = new Date();
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(content !== undefined && { content }),
        ...(excerpt !== undefined && { excerpt: excerpt || null }),
        ...(heroImageUrl !== undefined && { heroImageUrl: heroImageUrl || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(metaTitle !== undefined && { metaTitle: metaTitle || null }),
        ...(metaDescription !== undefined && { metaDescription: metaDescription || null }),
        ...(ogImageUrl !== undefined && { ogImageUrl: ogImageUrl || null }),
        ...(isPublished !== undefined && { isPublished, isDraft: !isPublished }),
        ...(readTime !== undefined && { readTime }),
        ...(publishedAt !== undefined && { publishedAt }),
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Handle tags: delete existing and recreate
    if (tags !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { postId: id } });

      if (tags.length > 0) {
        await prisma.blogPostTag.createMany({
          data: tags.map((tagId: string) => ({
            postId: id,
            tagId,
          })),
        });
      }

      // Re-fetch to include updated tags
      const updated = await prisma.blogPost.findUnique({
        where: { id },
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      createAuditLog({
        userId: user.id,
        action: "UPDATE_BLOG_POST",
        targetType: "BlogPost",
        targetId: id,
        details: { title: title || existing.title, slug: slug || existing.slug },
        request,
      });

      return NextResponse.json(updated);
    }

    createAuditLog({
      userId: user.id,
      action: "UPDATE_BLOG_POST",
      targetType: "BlogPost",
      targetId: id,
      details: { title: title || existing.title, slug: slug || existing.slug },
      request,
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating blog post:", error);
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

    const existing = await prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Blog post not found" },
        { status: 404 }
      );
    }

    await prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    createAuditLog({
      userId: user.id,
      action: "DELETE_BLOG_POST",
      targetType: "BlogPost",
      targetId: id,
      details: { title: existing.title, slug: existing.slug },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

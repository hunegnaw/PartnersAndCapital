import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const categoryId = searchParams.get("categoryId") || "";
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.BlogPostWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(status === "published" ? { isPublished: true } : {}),
      ...(status === "draft" ? { isPublished: false } : {}),
      ...(categoryId
        ? { categories: { some: { categoryId } } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
            ],
          }
        : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, pageSize });
  } catch (error) {
    console.error("Error listing blog posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      heroImageUrl,
      categoryId,
      categoryIds,
      metaTitle,
      metaDescription,
      ogImageUrl,
      isPublished,
      tags,
      publishedAt,
    } = body;

    // Support both categoryIds (new multi-select) and categoryId (legacy)
    const resolvedCategoryIds: string[] = categoryIds
      ? categoryIds
      : categoryId
        ? [categoryId]
        : [];

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 }
      );
    }

    // Calculate read time (avg 200 words per minute)
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Use explicit publishedAt if provided, otherwise auto-set on publish
    const resolvedPublishedAt = publishedAt
      ? new Date(publishedAt)
      : isPublished
        ? new Date()
        : null;

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        heroImageUrl: heroImageUrl || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        ogImageUrl: ogImageUrl || null,
        isPublished: isPublished || false,
        isDraft: !isPublished,
        publishedAt: resolvedPublishedAt,
        readTime,
        authorId: user.id,
        ...(resolvedCategoryIds.length > 0
          ? {
              categories: {
                create: resolvedCategoryIds.map((catId: string) => ({
                  categoryId: catId,
                })),
              },
            }
          : {}),
        ...(tags && tags.length > 0
          ? {
              tags: {
                create: tags.map((tagId: string) => ({
                  tagId,
                })),
              },
            }
          : {}),
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    createAuditLog({
      userId: user.id,
      action: "CREATE_BLOG_POST",
      targetType: "BlogPost",
      targetId: post.id,
      details: { title, slug, isPublished: isPublished || false },
      request,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    const result = await prisma.blogPost.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    createAuditLog({
      userId: user.id,
      action: "BULK_DELETE_BLOG_POSTS",
      targetType: "BlogPost",
      targetId: ids.join(","),
      details: { ids, deleted: result.count },
      request,
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error bulk deleting blog posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { posts } = body;

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: "posts array is required" },
        { status: 400 }
      );
    }

    for (const entry of posts) {
      if (!entry.id || typeof entry.sortOrder !== "number") {
        return NextResponse.json(
          { error: "Each entry must have id and sortOrder" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      posts.map((entry: { id: string; sortOrder: number }) =>
        prisma.blogPost.update({
          where: { id: entry.id },
          data: { sortOrder: entry.sortOrder },
        })
      )
    );

    await createAuditLog({
      userId: user.id,
      action: "REORDER_BLOG_POSTS",
      targetType: "BlogPost",
      details: { postCount: posts.length, posts },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering blog posts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

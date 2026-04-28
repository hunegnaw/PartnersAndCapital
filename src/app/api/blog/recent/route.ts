import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        heroImageUrl: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to fetch recent blog posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent blog posts" },
      { status: 500 }
    );
  }
}

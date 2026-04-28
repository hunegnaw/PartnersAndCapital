import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const tags = await prisma.blogTag.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error listing blog tags:", error);
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
    const { name, slug, color } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.blogTag.findFirst({
      where: {
        OR: [{ name }, { slug }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name or slug already exists" },
        { status: 409 }
      );
    }

    const tag = await prisma.blogTag.create({
      data: {
        name,
        slug,
        color: color || null,
      },
    });

    createAuditLog({
      userId: user.id,
      action: "CREATE_BLOG_TAG",
      targetType: "BlogTag",
      targetId: tag.id,
      details: { name, slug },
      request,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating blog tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

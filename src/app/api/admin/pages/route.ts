import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { Prisma, PageStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.PageWhereInput = {
      deletedAt: null,
      ...(search
        ? { title: { contains: search } }
        : {}),
      ...(status && Object.values(PageStatus).includes(status as PageStatus)
        ? { status: status as PageStatus }
        : {}),
    };

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        include: {
          _count: { select: { blocks: true } },
        },
        orderBy: [{ navOrder: "asc" }, { title: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.page.count({ where }),
    ]);

    return NextResponse.json({ pages, total, page, pageSize });
  } catch (error) {
    console.error("Error listing pages:", error);
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
    const { title, slug, status, isHomepage, metaTitle, metaDescription, ogImageUrl, showInNav, navLabel, navOrder, isBlogPage } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    // Check for existing slug
    const existing = await prisma.page.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A page with this slug already exists" },
        { status: 409 }
      );
    }

    // If this page is the homepage, unset any existing homepage
    if (isHomepage) {
      await prisma.page.updateMany({
        where: { isHomepage: true },
        data: { isHomepage: false },
      });
    }

    // If this page is the blog page, unset any existing blog page
    if (isBlogPage) {
      await prisma.page.updateMany({
        where: { isBlogPage: true },
        data: { isBlogPage: false },
      });
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        status: status || PageStatus.DRAFT,
        isHomepage: isHomepage || false,
        showInNav: showInNav || false,
        navLabel: navLabel || null,
        navOrder: typeof navOrder === "number" ? navOrder : 0,
        isBlogPage: isBlogPage || false,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        ogImageUrl: ogImageUrl || null,
      },
      include: {
        _count: { select: { blocks: true } },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_PAGE",
      targetType: "Page",
      targetId: page.id,
      details: { title, slug },
      request,
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

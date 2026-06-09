import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("archived") === "true";

    const where: Record<string, unknown> = { deletedAt: null };
    if (!includeArchived) where.isArchived = false;

    const banners = await prisma.statementBanner.findMany({
      where,
      include: {
        _count: { select: { assignments: true, placements: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { title, description, imageUrl, buttonText, buttonUrl, gradientFrom, gradientTo } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const banner = await prisma.statementBanner.create({
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        buttonText: buttonText || null,
        buttonUrl: buttonUrl || null,
        gradientFrom: gradientFrom || "#1A2640",
        gradientTo: gradientTo || "#1A2640",
      },
    });

    await createAuditLog({
      userId: admin.id,
      action: "CREATE_BANNER",
      targetType: "StatementBanner",
      targetId: banner.id,
      details: { title },
      request,
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

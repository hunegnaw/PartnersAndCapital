import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const [pages, assetClasses] = await Promise.all([
      prisma.page.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { id: true, title: true, slug: true, isHomepage: true },
        orderBy: { title: "asc" },
      }),
      prisma.assetClass.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return NextResponse.json({ pages, assetClasses });
  } catch (error) {
    console.error("Error fetching footer data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

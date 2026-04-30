import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { pages } = body;

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: "pages array is required" },
        { status: 400 }
      );
    }

    for (const entry of pages) {
      if (!entry.id || typeof entry.navOrder !== "number") {
        return NextResponse.json(
          { error: "Each entry must have id and navOrder" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      pages.map((entry: { id: string; navOrder: number }) =>
        prisma.page.update({
          where: { id: entry.id },
          data: { navOrder: entry.navOrder },
        })
      )
    );

    await createAuditLog({
      userId: user.id,
      action: "REORDER_PAGES",
      targetType: "Page",
      details: { pageCount: pages.length, pages },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

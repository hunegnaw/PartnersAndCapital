import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { order } = body as { order: { id: string; sortOrder: number }[] };

    if (!order?.length) {
      return NextResponse.json({ error: "order array required" }, { status: 400 });
    }

    await Promise.all(
      order.map((item) =>
        prisma.statementDisclosure.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering disclosures:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

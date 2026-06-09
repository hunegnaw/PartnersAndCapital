import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;

    const assignments = await prisma.statementBannerAssignment.findMany({
      where: { bannerId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const placements = await prisma.statementBannerPlacement.findMany({
      where: { bannerId: id },
      include: {
        statement: {
          select: {
            id: true,
            statementDate: true,
            status: true,
            sentAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignments, placements });
  } catch (error) {
    console.error("Error fetching banner assignments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

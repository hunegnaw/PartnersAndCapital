import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    if (search.length < 2) {
      return NextResponse.json({ clientInvestments: [] });
    }

    const clientInvestments = await prisma.clientInvestment.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        OR: [
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        investment: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: "asc" } },
      take: pageSize,
    });

    return NextResponse.json({ clientInvestments });
  } catch (error) {
    console.error("Error searching client investments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

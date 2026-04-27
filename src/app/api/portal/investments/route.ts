import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const investments = await prisma.clientInvestment.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        investment: { deletedAt: null },
      },
      include: {
        investment: {
          select: {
            id: true,
            name: true,
            status: true,
            targetReturn: true,
            vintage: true,
            assetClass: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ investments });
  } catch (error) {
    console.error("Error listing investments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

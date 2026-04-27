import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const clientInvestment = await prisma.clientInvestment.findFirst({
      where: {
        id,
        userId: user.id,
        deletedAt: null,
      },
      include: {
        investment: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            targetReturn: true,
            minimumInvestment: true,
            vintage: true,
            startDate: true,
            endDate: true,
            location: true,
            targetHoldPeriod: true,
            distributionCadence: true,
            fundStatus: true,
            assetClass: {
              select: { id: true, name: true, icon: true },
            },
            dealRoomUpdates: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
              },
            },
            documents: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                name: true,
                type: true,
                year: true,
                mimeType: true,
                fileSize: true,
                createdAt: true,
              },
            },
          },
        },
        contributions: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
            status: true,
            createdAt: true,
          },
        },
        distributions: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: {
            id: true,
            amount: true,
            date: true,
            type: true,
            description: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!clientInvestment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(clientInvestment);
  } catch (error) {
    console.error("Error fetching investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

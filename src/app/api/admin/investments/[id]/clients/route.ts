import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify investment exists
    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    const clientInvestments = await prisma.clientInvestment.findMany({
      where: { investmentId: id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            company: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clientInvestments);
  } catch (error) {
    console.error("Error listing investment clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { userId, amountInvested, currentValue, investmentDate } = body;

    if (!userId || amountInvested === undefined) {
      return NextResponse.json(
        { error: "userId and amountInvested are required" },
        { status: 400 }
      );
    }

    // Verify investment exists
    const investment = await prisma.investment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!investment) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 }
      );
    }

    // Verify client exists
    const client = await prisma.user.findFirst({
      where: { id: userId, role: "CLIENT", deletedAt: null },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Check for duplicate
    const existingPosition = await prisma.clientInvestment.findFirst({
      where: { userId, investmentId: id, deletedAt: null },
    });

    if (existingPosition) {
      return NextResponse.json(
        { error: "Client already has a position in this investment" },
        { status: 409 }
      );
    }

    const investDate = investmentDate ? new Date(investmentDate) : new Date();

    // Create client investment and initial contribution in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const clientInvestment = await tx.clientInvestment.create({
        data: {
          userId,
          investmentId: id,
          amountInvested,
          currentValue: currentValue ?? amountInvested,
          investmentDate: investDate,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
            },
          },
          investment: true,
        },
      });

      // Create initial contribution record
      await tx.contribution.create({
        data: {
          userId,
          clientInvestmentId: clientInvestment.id,
          amount: amountInvested,
          date: investDate,
          description: "Initial investment",
          status: "COMPLETED",
        },
      });

      return clientInvestment;
    });

    await createAuditLog({
      userId: user.id,
      action: "ADD_CLIENT_TO_INVESTMENT",
      targetType: "ClientInvestment",
      targetId: result.id,
      details: {
        clientId: userId,
        investmentId: id,
        amountInvested,
      },
      request,
    });

    // Notify client
    await createNotification({
      userId,
      type: "INVESTMENT_UPDATE",
      title: "Added to investment",
      message: `You've been added to ${investment.name}`,
      link: `/investments/${id}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding client to investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

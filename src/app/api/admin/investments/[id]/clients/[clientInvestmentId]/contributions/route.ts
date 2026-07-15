import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; clientInvestmentId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, clientInvestmentId } = await params;

    const position = await prisma.clientInvestment.findFirst({
      where: { id: clientInvestmentId, investmentId: id, deletedAt: null },
    });
    if (!position) {
      return NextResponse.json(
        { error: "Client investment position not found" },
        { status: 404 }
      );
    }

    const contributions = await prisma.contribution.findMany({
      where: { clientInvestmentId, deletedAt: null },
      orderBy: { date: "desc" },
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(contributions);
  } catch (error) {
    console.error("Error fetching contributions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; clientInvestmentId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, clientInvestmentId } = await params;
    const body = await request.json();
    const { amount, date, description } = body;

    if (!amount || !date) {
      return NextResponse.json(
        { error: "Amount and date are required" },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const position = await prisma.clientInvestment.findFirst({
      where: { id: clientInvestmentId, investmentId: id, deletedAt: null },
    });
    if (!position) {
      return NextResponse.json(
        { error: "Client investment position not found" },
        { status: 404 }
      );
    }

    // Contributions are bookkeeping records — amountInvested on the position
    // remains the source of truth and is not auto-adjusted here.
    const contribution = await prisma.contribution.create({
      data: {
        userId: position.userId,
        clientInvestmentId,
        amount: numAmount,
        date: new Date(date),
        description: description || null,
        status: "COMPLETED",
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_CONTRIBUTION",
      targetType: "Contribution",
      targetId: contribution.id,
      details: { clientInvestmentId, investmentId: id, amount: numAmount, date },
      request,
    });

    return NextResponse.json(contribution, { status: 201 });
  } catch (error) {
    console.error("Error creating contribution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

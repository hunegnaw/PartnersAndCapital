import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; clientInvestmentId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, clientInvestmentId } = await params;
    const body = await request.json();

    const existing = await prisma.clientInvestment.findFirst({
      where: {
        id: clientInvestmentId,
        investmentId: id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client investment position not found" },
        { status: 404 }
      );
    }

    const {
      amountInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      irr,
      returnMultiple,
      cashDistributed,
      status,
    } = body;

    const updated = await prisma.clientInvestment.update({
      where: { id: clientInvestmentId },
      data: {
        ...(amountInvested !== undefined && { amountInvested }),
        ...(currentValue !== undefined && { currentValue }),
        ...(totalReturn !== undefined && { totalReturn }),
        ...(returnPercentage !== undefined && { returnPercentage }),
        ...(irr !== undefined && { irr }),
        ...(returnMultiple !== undefined && { returnMultiple }),
        ...(cashDistributed !== undefined && { cashDistributed }),
        ...(status !== undefined && { status }),
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

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_CLIENT_INVESTMENT",
      targetType: "ClientInvestment",
      targetId: clientInvestmentId,
      details: body,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating client investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; clientInvestmentId: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id, clientInvestmentId } = await params;

    const existing = await prisma.clientInvestment.findFirst({
      where: {
        id: clientInvestmentId,
        investmentId: id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client investment position not found" },
        { status: 404 }
      );
    }

    await prisma.clientInvestment.update({
      where: { id: clientInvestmentId },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE_CLIENT_INVESTMENT",
      targetType: "ClientInvestment",
      targetId: clientInvestmentId,
      details: {
        investmentId: id,
        userId: existing.userId,
      },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client investment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { date, amount, type, description, status } = body;

    const existing = await prisma.distribution.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Distribution not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (date !== undefined) {
      data.date = new Date(date);
    }

    if (type !== undefined) {
      data.type = type;
    }

    if (description !== undefined) {
      data.description = description || null;
    }

    if (status !== undefined) {
      data.status = status;
    }

    let numAmount: number | undefined;
    if (amount !== undefined) {
      numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number" },
          { status: 400 }
        );
      }
      data.amount = numAmount;
    }

    // If amount changed, adjust cashDistributed on the ClientInvestment
    if (numAmount !== undefined) {
      const oldAmount = Number(existing.amount);
      const diff = numAmount - oldAmount;

      const updated = await prisma.$transaction(async (tx) => {
        const dist = await tx.distribution.update({
          where: { id },
          data,
        });

        if (diff !== 0) {
          await tx.clientInvestment.update({
            where: { id: existing.clientInvestmentId },
            data: {
              cashDistributed: { increment: diff },
            },
          });
        }

        return dist;
      });

      await createAuditLog({
        userId: user.id,
        action: "UPDATE_DISTRIBUTION",
        targetType: "Distribution",
        targetId: id,
        details: { ...body, oldAmount, diff },
        request,
      });

      return NextResponse.json(updated);
    }

    // No amount change, simple update
    const updated = await prisma.distribution.update({
      where: { id },
      data,
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_DISTRIBUTION",
      targetType: "Distribution",
      targetId: id,
      details: body,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating distribution:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

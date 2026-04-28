import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { distributionNoticeEmail } from "@/lib/email-templates";

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

    // Notify client about position update
    if (updated.user && updated.investment) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      if (cashDistributed !== undefined) {
        await createNotification({
          userId: updated.user.id,
          type: "DISTRIBUTION_RECEIVED",
          title: "Distribution recorded",
          message: `Distribution recorded for ${updated.investment.name}`,
          link: `/investments/${id}`,
        });
        await sendEmail({
          to: updated.user.email,
          subject: `Distribution recorded for ${updated.investment.name}`,
          html: distributionNoticeEmail({
            userName: updated.user.name || "Investor",
            investmentName: updated.investment.name,
            amount: `$${Number(cashDistributed).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            portalUrl: `${baseUrl}/investments/${id}`,
          }),
        });
      } else {
        await createNotification({
          userId: updated.user.id,
          type: "INVESTMENT_UPDATE",
          title: "Investment updated",
          message: `Your position in ${updated.investment.name} has been updated`,
          link: `/investments/${id}`,
        });
      }
    }

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

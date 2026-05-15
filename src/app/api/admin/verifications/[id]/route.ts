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

    const verification = await prisma.verification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            createdAt: true,
          },
        },
        reviewedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(verification);
  } catch (error) {
    console.error("Error fetching verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const verification = await prisma.verification.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    const updateData =
      action === "approve"
        ? {
            status: "APPROVED" as const,
            reviewedById: admin.id,
            reviewedAt: new Date(),
            reviewNotes: notes || null,
            rejectionReason: null,
          }
        : {
            status: "REJECTED" as const,
            reviewedById: admin.id,
            reviewedAt: new Date(),
            reviewNotes: notes || null,
            rejectionReason: notes || "Verification rejected",
          };

    const updated = await prisma.verification.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: admin.id,
      action: action === "approve" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      targetType: "Verification",
      targetId: id,
      details: { clientId: verification.userId, notes },
      request,
    });

    // Notify the client
    createNotification({
      userId: verification.userId,
      type: "SYSTEM_MESSAGE",
      title:
        action === "approve"
          ? "Verification Approved"
          : "Verification Requires Attention",
      message:
        action === "approve"
          ? "Your identity and accreditation verification has been approved. You now have full portal access."
          : `Your verification was not approved. ${notes || "Please contact support for details."}`,
      link: action === "approve" ? "/dashboard" : "/verify",
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

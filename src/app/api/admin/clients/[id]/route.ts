import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const client = await prisma.user.findFirst({
      where: { id, role: "CLIENT", deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        clientInvestments: {
          // Exclude positions whose fund itself was soft-deleted — otherwise the
          // row shows as a clickable dead link (the fund detail 404s) and its
          // money still counts in the client's totals.
          where: { deletedAt: null, investment: { deletedAt: null } },
          include: {
            investment: {
              include: { assetClass: true },
            },
            distributions: {
              where: { deletedAt: null },
              select: { id: true, amount: true, date: true },
            },
          },
        },
        documents: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            fileName: true,
            type: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            documents: { where: { deletedAt: null } },
            statements: { where: { deletedAt: null } },
          },
        },
        advisorsInvited: {
          include: {
            advisorUser: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        verification: {
          select: { id: true, status: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error fetching client:", error);
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
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, company, accountStatus } = body;

    const existing = await prisma.user.findFirst({
      where: { id, role: "CLIENT", deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Check email uniqueness if changing email
    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(company !== undefined && { company }),
        ...(accountStatus !== undefined && { accountStatus }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        company: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_CLIENT",
      targetType: "User",
      targetId: id,
      details: { name, email, phone, company, accountStatus },
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSuperAdmin();
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const existing = await prisma.user.findFirst({
      where: { id, role: "CLIENT", deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Cascade the archive to the client's positions, contributions, and
    // distributions using one shared timestamp. The exact timestamp lets the
    // restore re-activate precisely these rows (and not any that were manually
    // soft-deleted earlier). This keeps fund AUM/totals excluding archived
    // clients, since those aggregates filter deletedAt: null.
    const archivedAt = new Date();
    await prisma.$transaction([
      prisma.clientInvestment.updateMany({
        where: { userId: id, deletedAt: null },
        data: { deletedAt: archivedAt },
      }),
      prisma.contribution.updateMany({
        where: { userId: id, deletedAt: null },
        data: { deletedAt: archivedAt },
      }),
      prisma.distribution.updateMany({
        where: { userId: id, deletedAt: null },
        data: { deletedAt: archivedAt },
      }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: archivedAt },
      }),
    ]);

    await createAuditLog({
      userId: user.id,
      action: "DELETE_CLIENT",
      targetType: "User",
      targetId: id,
      details: { email: existing.email, name: existing.name },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

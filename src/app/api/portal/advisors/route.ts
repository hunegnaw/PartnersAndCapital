import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import crypto from "crypto";

export async function GET() {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const advisors = await prisma.advisor.findMany({
      where: { clientId: user.id },
      include: {
        accesses: {
          select: {
            id: true,
            permissionLevel: true,
            investmentId: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },
        },
        advisorUser: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ advisors });
  } catch (error) {
    console.error("Error listing advisors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const {
      name,
      email,
      firm,
      advisorType,
      permissionLevel,
      investmentId,
      expiresAt,
    } = body;

    if (!email || !permissionLevel) {
      return NextResponse.json(
        { error: "Email and permissionLevel are required" },
        { status: 400 }
      );
    }

    // Check if advisor already exists for this client
    const existing = await prisma.advisor.findFirst({
      where: { clientId: user.id, email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An advisor with this email has already been invited" },
        { status: 409 }
      );
    }

    const invitationToken = crypto.randomUUID();

    const advisor = await prisma.advisor.create({
      data: {
        clientId: user.id,
        email,
        name: name || null,
        firm: firm || null,
        advisorType: advisorType || null,
        invitationToken,
        status: "PENDING",
        accesses: {
          create: {
            userId: user.id,
            permissionLevel,
            investmentId: investmentId || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
        },
      },
      include: {
        accesses: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "INVITE_ADVISOR",
      targetType: "Advisor",
      targetId: advisor.id,
      details: { email, name, permissionLevel },
      request,
    });

    return NextResponse.json(advisor, { status: 201 });
  } catch (error) {
    console.error("Error inviting advisor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

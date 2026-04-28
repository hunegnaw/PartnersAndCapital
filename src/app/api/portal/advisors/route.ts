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
            accessStartAt: true,
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

    // Get last viewed dates from audit log for each advisor
    const advisorEmails = advisors
      .filter((a) => a.advisorUser)
      .map((a) => a.advisorUser!.id);

    const lastViewed: Record<string, string> = {};
    if (advisorEmails.length > 0) {
      const viewLogs = await prisma.auditLog.findMany({
        where: {
          userId: { in: advisorEmails },
          action: { in: ["AUTH_LOGIN", "VIEW_DASHBOARD", "VIEW_DOCUMENT", "DOWNLOAD_DOCUMENT"] },
        },
        orderBy: { createdAt: "desc" },
        distinct: ["userId"],
        select: {
          userId: true,
          createdAt: true,
        },
      });
      for (const log of viewLogs) {
        if (log.userId) {
          lastViewed[log.userId] = log.createdAt.toISOString();
        }
      }
    }

    // Get recent access log entries
    const accessLog = await prisma.auditLog.findMany({
      where: {
        targetType: "Advisor",
        OR: [
          { action: "INVITE_ADVISOR" },
          { action: "REVOKE_ADVISOR" },
          { action: "RESEND_ADVISOR_INVITE" },
        ],
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
    });

    const enrichedAdvisors = advisors.map((a) => ({
      ...a,
      lastViewedAt: a.advisorUser
        ? lastViewed[a.advisorUser.id] || null
        : null,
    }));

    return NextResponse.json({ advisors: enrichedAdvisors, accessLog });
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
      accessStartAt,
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
            accessStartAt: accessStartAt ? new Date(accessStartAt) : null,
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

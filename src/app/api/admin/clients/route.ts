import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "active";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.UserWhereInput = {
      role: "CLIENT",
      ...(status === "archived"
        ? { deletedAt: { not: null } }
        : status === "pending"
          ? { deletedAt: null, accountStatus: "PENDING" }
          : { deletedAt: null }),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [clients, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          deletedAt: true,
          clientInvestments: {
            where: { deletedAt: null },
            select: { amountInvested: true, currentValue: true },
          },
          _count: {
            select: {
              clientInvestments: true,
              documents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    const clientsWithTotals = clients.map((c) => {
      const totalInvested = c.clientInvestments.reduce((sum, ci) => sum + Number(ci.amountInvested), 0);
      const totalValue = c.clientInvestments.reduce((sum, ci) => sum + Number(ci.currentValue), 0);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clientInvestments: _, ...rest } = c;
      return { ...rest, totalInvested, totalValue };
    });

    return NextResponse.json({ clients: clientsWithTotals, total, page, pageSize });
  } catch (error) {
    console.error("Error listing clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { email, name, phone, company, accountStatus } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Generate a random temporary password (client will set their own via welcome email)
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const client = await prisma.user.create({
      data: {
        email,
        name,
        phone: phone || null,
        company: company || null,
        password: hashedPassword,
        role: "CLIENT",
        accountStatus: accountStatus || "ACTIVE",
        emailVerified: new Date(),
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
      action: "CREATE_CLIENT",
      targetType: "User",
      targetId: client.id,
      details: { email, name },
      request,
    });

    // Generate password reset token and send welcome email
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.deleteMany({ where: { email } });
    await prisma.passwordResetToken.create({
      data: { email, token, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    sendEmail({
      to: email,
      subject: "Welcome to Partners + Capital",
      html: welcomeEmail({ userName: name, resetUrl }),
    }).catch((err) => console.error("Failed to send welcome email:", err));

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

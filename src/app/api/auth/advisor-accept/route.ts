import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find the advisor by invitation token with PENDING status
    const advisor = await prisma.advisor.findFirst({
      where: {
        invitationToken: token,
        status: "PENDING",
      },
      include: {
        client: { select: { name: true } },
        accesses: { select: { permissionLevel: true } },
      },
    });

    if (!advisor) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if advisor already has a User account
    const existingUser = await prisma.user.findUnique({
      where: { email: advisor.email },
    });

    return NextResponse.json({
      advisor: {
        name: advisor.name,
        email: advisor.email,
        firm: advisor.firm,
      },
      client: {
        name: advisor.client.name,
      },
      permissionLevel: advisor.accesses[0]?.permissionLevel,
      hasAccount: !!existingUser,
    });
  } catch (error) {
    console.error("Advisor accept GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, name, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find the advisor by invitation token with PENDING status
    const advisor = await prisma.advisor.findFirst({
      where: {
        invitationToken: token,
        status: "PENDING",
      },
      include: {
        client: { select: { name: true } },
        accesses: { select: { permissionLevel: true } },
      },
    });

    if (!advisor) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if advisor already has a User account
    const existingUser = await prisma.user.findUnique({
      where: { email: advisor.email },
    });

    let userId: string;

    if (!existingUser) {
      // New user — require name and password
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        );
      }

      if (!password || typeof password !== "string" || password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await prisma.user.create({
        data: {
          email: advisor.email,
          name: name.trim(),
          password: hashedPassword,
          role: "ADVISOR",
        },
      });

      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    // Update advisor status to ACTIVE
    await prisma.advisor.update({
      where: { id: advisor.id },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date(),
        advisorUserId: userId,
        invitationToken: null,
      },
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "ADVISOR_ACCEPTED",
      targetType: "Advisor",
      targetId: advisor.id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Advisor accept POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

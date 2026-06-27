import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "25");
    const status = searchParams.get("status");

    const where = status ? { status } : {};

    const [requests, total] = await Promise.all([
      prisma.accessRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.accessRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching access requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create an access request manually (e.g. a request received by phone/email).
export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const smsConsent = Boolean(body.smsConsent);
    const status = body.status === "REVIEWED" ? "REVIEWED" : "PENDING";

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const created = await prisma.accessRequest.create({
      data: { name, email, phone, smsConsent, status },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_ACCESS_REQUEST",
      targetType: "AccessRequest",
      targetId: created.id,
      details: { name, email },
      request,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating access request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

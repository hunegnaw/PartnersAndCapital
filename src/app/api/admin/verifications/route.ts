import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20"))
    );

    const where: Prisma.VerificationWhereInput = {
      ...(status ? { status: status as Prisma.EnumVerificationStatusFilter } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            },
          }
        : {}),
    };

    const [verifications, total] = await Promise.all([
      prisma.verification.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.verification.count({ where }),
    ]);

    return NextResponse.json({ verifications, total, page, pageSize });
  } catch (error) {
    console.error("Error listing verifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

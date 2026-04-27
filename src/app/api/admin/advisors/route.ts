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
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: Prisma.AdvisorWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { firm: { contains: search } },
            ],
          }
        : {}),
      ...(status ? { status: status as Prisma.EnumAdvisorStatusFilter["equals"] } : {}),
    };

    const [advisors, total] = await Promise.all([
      prisma.advisor.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
            },
          },
          advisorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          accesses: {
            select: {
              id: true,
              permissionLevel: true,
              investmentId: true,
              expiresAt: true,
              revokedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.advisor.count({ where }),
    ]);

    return NextResponse.json({ advisors, total, page, pageSize });
  } catch (error) {
    console.error("Error listing advisors:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

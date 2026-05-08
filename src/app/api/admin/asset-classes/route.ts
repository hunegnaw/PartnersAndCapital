import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const assetClasses = await prisma.assetClass.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { investments: { where: { deletedAt: null } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(assetClasses);
  } catch (error) {
    console.error("Error listing asset classes:", error);
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
    const { name, description, icon, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const assetClass = await prisma.assetClass.create({
      data: {
        name: name.trim(),
        description: description || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE_ASSET_CLASS",
      targetType: "AssetClass",
      targetId: assetClass.id,
      details: { name },
      request,
    });

    return NextResponse.json(assetClass, { status: 201 });
  } catch (error) {
    console.error("Error creating asset class:", error);
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "An asset class with that name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

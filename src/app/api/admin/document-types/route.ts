import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const types = await prisma.documentType.findMany({
      orderBy: { sortOrder: "asc" },
    });

    // Get document counts per type
    const counts = await prisma.document.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { type: true },
    });

    const countMap: Record<string, number> = {};
    for (const c of counts) {
      countMap[c.type] = c._count.type;
    }

    const result = types.map((t) => ({
      ...t,
      documentCount: countMap[t.value] || 0,
    }));

    return NextResponse.json({ documentTypes: result });
  } catch (error) {
    console.error("Error listing document types:", error);
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
    const { label } = body;

    if (!label || typeof label !== "string" || !label.trim()) {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const trimmedLabel = label.trim();

    // Auto-generate value from label: "My Type" → "MY_TYPE"
    const value = trimmedLabel
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    if (!value) {
      return NextResponse.json(
        { error: "Label must contain at least one alphanumeric character" },
        { status: 400 }
      );
    }

    // Check for duplicate value
    const existing = await prisma.documentType.findUnique({
      where: { value },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A document type with code "${value}" already exists` },
        { status: 409 }
      );
    }

    // Get the highest sortOrder to append at the end
    const maxSort = await prisma.documentType.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const documentType = await prisma.documentType.create({
      data: {
        value,
        label: trimmedLabel,
        isDefault: false,
        sortOrder: (maxSort?.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(documentType, { status: 201 });
  } catch (error) {
    console.error("Error creating document type:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

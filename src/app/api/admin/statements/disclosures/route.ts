import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const disclosures = await prisma.statementDisclosure.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(disclosures);
  } catch (error) {
    console.error("Error fetching disclosures:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const body = await request.json();
    const { title, body: disclosureBody } = body;

    if (!title || !disclosureBody) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const maxOrder = await prisma.statementDisclosure.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const disclosure = await prisma.statementDisclosure.create({
      data: {
        title,
        body: disclosureBody,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(disclosure, { status: 201 });
  } catch (error) {
    console.error("Error creating disclosure:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

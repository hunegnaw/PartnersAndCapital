import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const organization = await prisma.organization.findFirst();
    if (!organization) {
      return NextResponse.json({ colors: [] });
    }

    const colors = (organization.savedColors as string[]) || [];
    return NextResponse.json({ colors });
  } catch (error) {
    console.error("Error fetching saved colors:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { colors } = body;

    if (!Array.isArray(colors)) {
      return NextResponse.json({ error: "colors must be an array" }, { status: 400 });
    }

    const organization = await prisma.organization.findFirst();
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    await prisma.organization.update({
      where: { id: organization.id },
      data: { savedColors: colors },
    });

    return NextResponse.json({ colors });
  } catch (error) {
    console.error("Error updating saved colors:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const organization = await prisma.organization.findFirst();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSuperAdmin();
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    const organization = await prisma.organization.findFirst();
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const {
      name,
      legalName,
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      email,
      phone,
      website,
      address,
      disclaimer,
      privacyPolicy,
      termsOfService,
      twoFactorPolicy,
      typography,
      footer,
    } = body;

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(address !== undefined && { address }),
        ...(disclaimer !== undefined && { disclaimer }),
        ...(privacyPolicy !== undefined && { privacyPolicy }),
        ...(termsOfService !== undefined && { termsOfService }),
        ...(twoFactorPolicy !== undefined && { twoFactorPolicy }),
        ...(typography !== undefined && { typography }),
        ...(footer !== undefined && { footer }),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE_ORGANIZATION",
      targetType: "Organization",
      targetId: organization.id,
      details: body,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

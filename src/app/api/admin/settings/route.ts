import { NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  SETTING_STATEMENT_EMAIL_SUPPRESSION,
  getBooleanSetting,
  setBooleanSetting,
} from "@/lib/system-settings";

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

    const statementEmailSuppressionEnabled = await getBooleanSetting(
      SETTING_STATEMENT_EMAIL_SUPPRESSION,
      true
    );

    return NextResponse.json({ ...organization, statementEmailSuppressionEnabled });
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
      logoScrolledUrl,
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
      statementEmailSuppressionEnabled,
    } = body;

    if (statementEmailSuppressionEnabled !== undefined) {
      await setBooleanSetting(
        SETTING_STATEMENT_EMAIL_SUPPRESSION,
        Boolean(statementEmailSuppressionEnabled)
      );
    }

    const updated = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(logoScrolledUrl !== undefined && { logoScrolledUrl }),
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

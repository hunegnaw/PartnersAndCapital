import { NextResponse } from "next/server";
import { requireClient } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireClient();
    if (user instanceof NextResponse) return user;

    const [verification, userRecord] = await Promise.all([
      prisma.verification.findUnique({ where: { userId: user.id } }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { accountStatus: true },
      }),
    ]);

    return NextResponse.json({
      verification: verification || null,
      accountStatus: userRecord?.accountStatus || null,
    });
  } catch (error) {
    console.error("Error fetching verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireClient();
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    // Check current status — can't edit if already submitted or approved
    const existing = await prisma.verification.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });

    if (
      existing &&
      (existing.status === "SUBMITTED" || existing.status === "APPROVED")
    ) {
      return NextResponse.json(
        { error: "Verification already submitted" },
        { status: 400 }
      );
    }

    const {
      legalFirstName,
      legalLastName,
      country,
      address,
      city,
      zipCode,
      idDocumentType,
      accreditationBasis,
      accreditationDocType,
      status,
      bypass,
    } = body;

    // Bypass: existing clients (ACTIVE) can skip verification
    if (bypass === true) {
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { accountStatus: true },
      });
      if (userRecord?.accountStatus !== "ACTIVE") {
        return NextResponse.json(
          { error: "Bypass is only available for existing clients" },
          { status: 403 }
        );
      }
      const verification = await prisma.verification.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          status: "APPROVED",
          reviewNotes: "Bypassed by existing client",
        },
        update: {
          status: "APPROVED",
          reviewNotes: "Bypassed by existing client",
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ verification });
    }

    const data: Record<string, unknown> = {};
    if (legalFirstName !== undefined) data.legalFirstName = legalFirstName;
    if (legalLastName !== undefined) data.legalLastName = legalLastName;
    if (country !== undefined) data.country = country;
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (zipCode !== undefined) data.zipCode = zipCode;
    if (idDocumentType !== undefined) data.idDocumentType = idDocumentType;
    if (accreditationBasis !== undefined)
      data.accreditationBasis = accreditationBasis;
    if (accreditationDocType !== undefined)
      data.accreditationDocType = accreditationDocType;
    if (status === "IN_PROGRESS") data.status = "IN_PROGRESS";

    const verification = await prisma.verification.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        status: "IN_PROGRESS",
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ verification });
  } catch (error) {
    console.error("Error updating verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

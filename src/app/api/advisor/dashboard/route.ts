import { NextResponse } from "next/server";
import { requireAdvisor } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAdvisor();
  if (user instanceof NextResponse) return user;

  try {
    // Find all active advisor records for this advisor user
    const advisorRecords = await prisma.advisor.findMany({
      where: { advisorUserId: user.id, status: "ACTIVE" },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        accesses: {
          where: { revokedAt: null },
          select: { permissionLevel: true, expiresAt: true, investmentId: true },
        },
      },
    });

    const now = new Date();

    // Build enriched client list
    const clients = await Promise.all(
      advisorRecords.map(async (advisor) => {
        // Filter out expired accesses
        const activeAccesses = advisor.accesses.filter(
          (a) => !a.expiresAt || new Date(a.expiresAt) > now
        );

        if (activeAccesses.length === 0) return null;

        // Get the highest permission level and earliest expiry
        const access = activeAccesses[0];

        // Get client investment positions
        const positions = await prisma.clientInvestment.findMany({
          where: { userId: advisor.clientId, deletedAt: null },
          select: { amountInvested: true, currentValue: true, updatedAt: true },
        });

        const totalInvested = positions.reduce(
          (sum, p) => sum + Number(p.amountInvested),
          0
        );
        const currentValue = positions.reduce(
          (sum, p) => sum + Number(p.currentValue),
          0
        );

        // Find the latest update time
        const lastUpdated =
          positions.length > 0
            ? positions.reduce(
                (latest, p) =>
                  p.updatedAt > latest ? p.updatedAt : latest,
                positions[0].updatedAt
              )
            : new Date();

        return {
          id: advisor.client.id,
          name: advisor.client.name || advisor.client.email,
          email: advisor.client.email,
          company: advisor.client.company,
          totalInvested,
          currentValue,
          permissionLevel: access.permissionLevel,
          accessExpiry: access.expiresAt ? access.expiresAt.toISOString() : null,
          lastUpdated: lastUpdated.toISOString(),
        };
      })
    );

    // Filter out nulls (advisors with no active access)
    const activeClients = clients.filter(Boolean);

    return NextResponse.json({ clients: activeClients });
  } catch (error) {
    console.error("Advisor dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}

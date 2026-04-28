import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "active";

    const where = {
      role: "CLIENT" as const,
      ...(status === "archived"
        ? { deletedAt: { not: null } }
        : status === "active"
          ? { deletedAt: null }
          : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const clients = await prisma.user.findMany({
      where,
      include: {
        clientInvestments: {
          where: { deletedAt: null },
          select: {
            amountInvested: true,
            currentValue: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Build CSV
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Total Invested",
      "Current Value",
      "Last Login",
      "Status",
    ];

    const rows = clients.map((c) => {
      const totalInvested = c.clientInvestments.reduce(
        (sum, ci) => sum + Number(ci.amountInvested),
        0
      );
      const currentValue = c.clientInvestments.reduce(
        (sum, ci) => sum + Number(ci.currentValue),
        0
      );

      return [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        c.email,
        c.phone || "",
        `"${(c.company || "").replace(/"/g, '""')}"`,
        totalInvested.toFixed(2),
        currentValue.toFixed(2),
        c.lastLoginAt ? c.lastLoginAt.toISOString() : "Never",
        c.deletedAt ? "Archived" : "Active",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="clients-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

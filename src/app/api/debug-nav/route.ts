import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const allPages = await prisma.page.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      showInNav: true,
      navLabel: true,
      navOrder: true,
      isHomepage: true,
      isBlogPage: true,
    },
    orderBy: [{ navOrder: "asc" }, { title: "asc" }],
  });

  const navFiltered = allPages.filter(
    (p) => p.showInNav === true && p.status === "PUBLISHED"
  );

  return NextResponse.json({ allPages, navFiltered });
}

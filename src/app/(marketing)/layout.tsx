import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navPages, investments] = await Promise.all([
    prisma.page.findMany({
      where: { showInNav: true, status: "PUBLISHED", deletedAt: null },
      select: { slug: true, title: true, navLabel: true, navOrder: true, isHomepage: true, isBlogPage: true },
      orderBy: [{ navOrder: "asc" }, { title: "asc" }],
    }),
    prisma.investment.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const navLinks = navPages.map((p) => ({
    href: p.isHomepage ? "/" : `/${p.slug}`,
    label: p.navLabel || p.title,
  }));

  const investmentLinks = investments.map((inv) => ({
    id: inv.id,
    label: inv.name,
  }));

  return (
    <>
      <MarketingHeader navLinks={navLinks} />
      <div className="min-h-screen flex flex-col marketing-typography">
        <main className="flex-1">{children}</main>
        <MarketingFooter investmentLinks={investmentLinks} />
      </div>
    </>
  );
}

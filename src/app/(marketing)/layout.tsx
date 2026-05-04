import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navPages = await prisma.page.findMany({
    where: { showInNav: true, status: "PUBLISHED", deletedAt: null },
    select: { slug: true, title: true, navLabel: true, navOrder: true, isHomepage: true, isBlogPage: true },
    orderBy: [{ navOrder: "asc" }, { title: "asc" }],
  });

  const navLinks = navPages.map((p) => ({
    href: p.isHomepage ? "/" : `/${p.slug}`,
    label: p.navLabel || p.title,
  }));

  return (
    <div className="min-h-screen flex flex-col marketing-typography">
      <MarketingHeader navLinks={navLinks} />
      <main className="flex-1">{children}</main>
      <MarketingFooter navLinks={navLinks} />
    </div>
  );
}

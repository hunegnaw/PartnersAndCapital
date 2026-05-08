import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { prisma } from "@/lib/prisma";
import { getOrganization } from "@/lib/organization";
import { mergeTypography, type TypographySettings } from "@/lib/typography";

export const dynamic = "force-dynamic";

function buildTypographyCss(typography: TypographySettings): string {
  const vars: string[] = [];
  const categories = [
    { key: "heroTitle", prefix: "hero-title" },
    { key: "sectionHeading", prefix: "section-heading" },
    { key: "sectionTag", prefix: "section-tag" },
    { key: "subtitle", prefix: "subtitle" },
    { key: "body", prefix: "body" },
    { key: "adminBody", prefix: "admin-body" },
    { key: "portalBody", prefix: "portal-body" },
    { key: "h1", prefix: "h1" },
    { key: "h2", prefix: "h2" },
    { key: "h3", prefix: "h3" },
    { key: "h4", prefix: "h4" },
    { key: "h5", prefix: "h5" },
    { key: "h6", prefix: "h6" },
  ] as const;

  for (const { key, prefix } of categories) {
    const s = typography[key];
    vars.push(`--font-${prefix}-family:'${s.fontFamily}',sans-serif`);
    vars.push(`--font-${prefix}-weight:${s.fontWeight}`);
    vars.push(`--font-${prefix}-style:${s.fontStyle}`);
    vars.push(`--font-${prefix}-color:${s.color}`);
    vars.push(`--font-${prefix}-size:${s.fontSize}`);
  }

  return `:root{${vars.join(";")}}`;
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navPages, investments, org] = await Promise.all([
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
    getOrganization(),
  ]);

  const typography = mergeTypography(
    (org?.typography as Partial<TypographySettings>) ?? null
  );
  const typoCss = buildTypographyCss(typography);

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
      <style dangerouslySetInnerHTML={{ __html: typoCss }} />
      <MarketingHeader navLinks={navLinks} />
      <div className="min-h-screen flex flex-col marketing-typography">
        <main className="flex-1">{children}</main>
        <MarketingFooter investmentLinks={investmentLinks} />
      </div>
    </>
  );
}

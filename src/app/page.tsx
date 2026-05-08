import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { getOrganization } from "@/lib/organization";
import { mergeTypography, type TypographySettings } from "@/lib/typography";

export default async function Home() {
  const session = await auth();

  // Load the homepage from CMS
  const homepage = await prisma.page.findFirst({
    where: { isHomepage: true, status: "PUBLISHED", deletedAt: null },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Fallback: if no homepage exists, redirect based on auth state
  if (!homepage) {
    if (session?.user) {
      const role = session.user.role;
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        redirect("/admin");
      } else if (role === "ADVISOR") {
        redirect("/advisor/dashboard");
      } else {
        redirect("/dashboard");
      }
    }
    redirect("/login");
  }

  // Fetch nav links for header/footer
  const [navPages, investments, org] = await Promise.all([
    prisma.page.findMany({
      where: { showInNav: true, status: "PUBLISHED", deletedAt: null },
      select: { slug: true, title: true, navLabel: true, navOrder: true, isHomepage: true },
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
  const typoCssVars = Object.entries({
    "hero-title": typography.heroTitle,
    "section-heading": typography.sectionHeading,
    "section-tag": typography.sectionTag,
    subtitle: typography.subtitle,
    body: typography.body,
    h1: typography.h1,
    h2: typography.h2,
    h3: typography.h3,
    h4: typography.h4,
    h5: typography.h5,
    h6: typography.h6,
  }).flatMap(([prefix, s]) => [
    `--font-${prefix}-family:'${s.fontFamily}',sans-serif`,
    `--font-${prefix}-weight:${s.fontWeight}`,
    `--font-${prefix}-style:${s.fontStyle}`,
    `--font-${prefix}-color:${s.color}`,
    `--font-${prefix}-size:${s.fontSize}`,
  ]).join(";");
  const typoCss = `:root{${typoCssVars}}`;
  const navLinks = navPages.map((p) => ({
    href: p.isHomepage ? "/" : `/${p.slug}`,
    label: p.navLabel || p.title,
  }));
  const investmentLinks = investments.map((inv) => ({ id: inv.id, label: inv.name }));

  const blocks = homepage.blocks.map((b) => ({
    id: b.id,
    type: b.type,
    props: b.props as Record<string, unknown>,
    sortOrder: b.sortOrder,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: typoCss }} />
      <MarketingHeader transparent navLinks={navLinks} />
      <main className="flex-1">
        <BlockRenderer blocks={blocks} />
      </main>
      <MarketingFooter investmentLinks={investmentLinks} />

      {/* Floating portal button for authenticated users */}
      {session?.user && (
        <Link
          href={
            session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN"
              ? "/admin"
              : session.user.role === "ADVISOR"
              ? "/advisor/dashboard"
              : "/dashboard"
          }
          className="fixed bottom-6 right-6 z-50 bg-[#1A2640] text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium hover:bg-[#2C3E5C] transition-colors"
          style={{ fontFamily: "var(--font-body-family, Inter), sans-serif" }}
        >
          Go to Portal
        </Link>
      )}
    </div>
  );
}

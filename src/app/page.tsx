import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default async function Home() {
  const session = await auth();

  // Load the homepage from CMS
  const homepage = await prisma.page.findFirst({
    where: { isHomepage: true, status: "PUBLISHED", deletedAt: null },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Fallback: if no homepage exists, redirect to login
  if (!homepage) {
    redirect("/login");
  }

  const blocks = homepage.blocks.map((b) => ({
    id: b.id,
    type: b.type,
    props: b.props as Record<string, unknown>,
    sortOrder: b.sortOrder,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingHeader transparent />
      <main className="flex-1">
        <BlockRenderer blocks={blocks} />
      </main>
      <MarketingFooter />

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
          className="fixed bottom-6 right-6 z-50 bg-[#0f1c2e] text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium hover:bg-[#1e3a5f] transition-colors"
        >
          Go to Portal
        </Link>
      )}
    </div>
  );
}

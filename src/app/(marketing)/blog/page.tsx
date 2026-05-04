import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { BlogListing } from "@/components/marketing/blog-listing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Thoughts | Partners + Capital",
  description: "Insights and analysis from Partners + Capital on private markets, investments, and wealth building.",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; tag?: string; search?: string }>;
}) {
  const params = await searchParams;

  // Look up the designated blog page for its hero image
  const blogPage = await prisma.page.findFirst({
    where: { isBlogPage: true, status: "PUBLISHED", deletedAt: null },
    select: { title: true, featuredImageUrl: true },
  });

  return (
    <BlogListing
      searchParams={params}
      basePath="/blog"
      heroTitle={blogPage?.title}
      heroImageUrl={blogPage?.featuredImageUrl}
    />
  );
}

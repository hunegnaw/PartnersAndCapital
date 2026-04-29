import type { Metadata } from "next";
import { BlogListing } from "@/components/marketing/blog-listing";

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
  return <BlogListing searchParams={params} basePath="/blog" />;
}

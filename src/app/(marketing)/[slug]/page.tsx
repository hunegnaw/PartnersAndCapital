import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BlockRenderer } from "@/components/blocks/block-renderer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: { title: true, metaTitle: true, metaDescription: true, ogImageUrl: true },
  });
  if (!page) return { title: "Page Not Found" };
  return {
    title: page.metaTitle || `${page.title} | Partners + Capital`,
    description: page.metaDescription || "",
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || "",
      images: page.ogImageUrl ? [{ url: page.ogImageUrl }] : undefined,
    },
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    include: {
      blocks: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!page) notFound();

  const blocks = page.blocks.map((b) => ({
    id: b.id,
    type: b.type,
    props: b.props as Record<string, unknown>,
    sortOrder: b.sortOrder,
  }));

  return <BlockRenderer blocks={blocks} />;
}

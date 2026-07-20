import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShareButton } from "@/components/blog/share-button";
import { PageHero } from "@/components/marketing/page-hero";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    select: { title: true, excerpt: true, metaTitle: true, metaDescription: true, ogImageUrl: true, heroImageUrl: true },
  });
  if (!post) return { title: "Post Not Found" };
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || "";
  // Prefer an explicit OG image, else fall back to the hero image. Relative
  // paths are resolved to absolute via metadataBase (set in the root layout).
  const imageUrl = post.ogImageUrl || post.heroImageUrl || undefined;
  return {
    title: post.metaTitle || `${post.title} | Partners + Capital`,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    include: {
      categories: { include: { category: { select: { id: true, name: true, slug: true, color: true } } } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      author: { select: { id: true, name: true } },
    },
  });

  if (!post) notFound();

  // Disclosures flagged to show on the blog (rendered as fine print under the article).
  const blogDisclosures = await prisma.statementDisclosure.findMany({
    where: { isActive: true, showOnBlog: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, body: true },
  });

  // Fire-and-forget view count increment
  prisma.blogPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Fetch related posts (same categories, exclude current)
  const categoryIds = post.categories.map((pc: { category: { id: string } }) => pc.category.id);
  const relatedPosts = categoryIds.length > 0
    ? await prisma.blogPost.findMany({
        where: {
          categories: { some: { categoryId: { in: categoryIds } } },
          id: { not: post.id },
          isPublished: true,
          deletedAt: null,
        },
        take: 3,
        orderBy: { publishedAt: "desc" },
        select: { id: true, title: true, slug: true, excerpt: true, heroImageUrl: true, publishedAt: true },
      })
    : [];

  return (
    <div className="bg-[#f5f5f3] min-h-screen">
      {/* Hero */}
      <PageHero title={post.title} imageUrl={post.heroImageUrl} />

      {/* Breadcrumbs + Meta */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#B07D3A]">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[#B07D3A]">Partner Thoughts</Link>
          <span>/</span>
          <span className="text-gray-600 truncate">{post.title}</span>
        </nav>

        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {post.author?.name && <span>By {post.author.name}</span>}
            {post.publishedAt && (
              <time>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
            {post.readTime && <span>{post.readTime} min read</span>}
            <span>{post.viewCount.toLocaleString()} views</span>
          </div>
          <ShareButton title={post.title} />
        </div>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6 pb-16">
        <div
          className="prose prose-lg max-w-none prose-headings:text-[#1A2640] prose-a:text-[#B07D3A] prose-strong:text-[#1A2640]"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((pt) => (
                <Link
                  key={pt.tag.id}
                  href={`/blog?tag=${pt.tag.slug}`}
                  className="px-3 py-1 text-xs rounded-full bg-white border text-gray-600 hover:bg-gray-100"
                >
                  {pt.tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Blog disclaimers (from Settings → Disclosures, "Show on blog") */}
        {blogDisclosures.length > 0 && (
          <div className="mt-12 pt-6 border-t border-gray-200 space-y-3 text-xs text-gray-400 leading-relaxed">
            {blogDisclosures.map((d) => (
              <div
                key={d.id}
                className="[&_p]:m-0 [&_p]:mb-2 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: d.body }}
              />
            ))}
          </div>
        )}
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-[#1A2640] mb-8">
              Related Posts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.slug}`}
                  className="group"
                >
                  {rp.heroImageUrl ? (
                    <div className="aspect-[16/10] rounded-lg overflow-hidden mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rp.heroImageUrl}
                        alt={rp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-[#1A2640] to-[#1A2640] flex items-center justify-center mb-3">
                      <span className="text-white/20 text-4xl font-bold">P+C</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-[#1A2640] group-hover:text-[#B07D3A] transition-colors">
                    {rp.title}
                  </h3>
                  {rp.publishedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(rp.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

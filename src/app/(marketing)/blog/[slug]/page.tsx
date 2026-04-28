import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShareButton } from "@/components/blog/share-button";

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
  return {
    title: post.metaTitle || `${post.title} | Partners + Capital`,
    description: post.metaDescription || post.excerpt || "",
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || "",
      images: post.ogImageUrl || post.heroImageUrl ? [{ url: post.ogImageUrl || post.heroImageUrl! }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      author: { select: { id: true, name: true } },
    },
  });

  if (!post) notFound();

  // Fire-and-forget view count increment
  prisma.blogPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Fetch related posts (same category, exclude current)
  const relatedPosts = post.categoryId
    ? await prisma.blogPost.findMany({
        where: {
          categoryId: post.categoryId,
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
    <div className="bg-[#faf8f5] min-h-screen">
      {/* Hero */}
      {post.heroImageUrl ? (
        <div className="relative h-[50vh] min-h-[400px]">
          <img
            src={post.heroImageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 max-w-4xl mx-auto px-6 pb-12">
            <div className="flex items-center gap-3 mb-4">
              {post.category && (
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: post.category.color || "#b8860b" }}
                >
                  {post.category.name}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              {post.title}
            </h1>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1c2e] py-20">
          <div className="max-w-4xl mx-auto px-6">
            {post.category && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full text-white inline-block mb-4"
                style={{ backgroundColor: post.category.color || "#b8860b" }}
              >
                {post.category.name}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
              {post.title}
            </h1>
          </div>
        </div>
      )}

      {/* Breadcrumbs + Meta */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#b8860b]">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[#b8860b]">Partner Thoughts</Link>
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
          className="prose prose-lg max-w-none prose-headings:text-[#0f1c2e] prose-a:text-[#b8860b] prose-strong:text-[#0f1c2e]"
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
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-[#0f1c2e] mb-8">
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
                      <img
                        src={rp.heroImageUrl}
                        alt={rp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-[#0f1c2e] to-[#1e3a5f] flex items-center justify-center mb-3">
                      <span className="text-white/20 text-4xl font-bold">P+C</span>
                    </div>
                  )}
                  <h3 className="font-semibold text-[#0f1c2e] group-hover:text-[#b8860b] transition-colors">
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

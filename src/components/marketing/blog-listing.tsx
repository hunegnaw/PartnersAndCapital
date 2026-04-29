import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface BlogListingProps {
  searchParams?: { page?: string; category?: string; tag?: string; search?: string };
  basePath?: string;
}

export async function BlogListing({ searchParams, basePath = "/blog" }: BlogListingProps) {
  const params = searchParams || {};
  const page = parseInt(params.page || "1");
  const pageSize = 9;
  const categorySlug = params.category || "";
  const tagSlug = params.tag || "";
  const search = params.search || "";

  const where: Record<string, unknown> = {
    isPublished: true,
    deletedAt: null,
  };
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }
  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug } } };
  }
  if (search) {
    where.title = { contains: search };
  }

  const [posts, total, categories, tags] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true, color: true } } } },
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="bg-[#f5f5f3] min-h-screen">
      {/* Hero */}
      <div className="bg-[#1A2640] py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Partner Thoughts
        </h1>
        <p className="text-white/60 mt-3 text-lg">
          Insights and analysis on private markets
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Link
            href={basePath}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              !categorySlug
                ? "bg-[#1A2640] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`${basePath}?category=${cat.slug}`}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                categorySlug === cat.slug
                  ? "bg-[#1A2640] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Post Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {post.heroImageUrl ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={post.heroImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-[#1A2640] to-[#1A2640] flex items-center justify-center">
                    <span className="text-white/20 text-6xl font-bold">P+C</span>
                  </div>
                )}
                <div className="p-5">
                  {post.category && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (post.category.color || "#B07D3A") + "20",
                        color: post.category.color || "#B07D3A",
                      }}
                    >
                      {post.category.name}
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-[#1A2640] mt-2 group-hover:text-[#B07D3A] transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
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
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            {page > 1 && (
              <Link
                href={`${basePath}?page=${page - 1}${categorySlug ? `&category=${categorySlug}` : ""}${search ? `&search=${search}` : ""}`}
                className="px-4 py-2 text-sm rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`${basePath}?page=${page + 1}${categorySlug ? `&category=${categorySlug}` : ""}${search ? `&search=${search}` : ""}`}
                className="px-4 py-2 text-sm rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`${basePath}?tag=${tag.slug}`}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    tagSlug === tag.slug
                      ? "bg-[#B07D3A] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

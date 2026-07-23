import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHero } from "@/components/marketing/page-hero";
import { BlogSortSelect } from "@/components/marketing/blog-sort-select";

interface BlogListingProps {
  searchParams?: { page?: string; category?: string; tag?: string; search?: string; sort?: string };
  basePath?: string;
  heroTitle?: string;
  heroImageUrl?: string | null;
  heroTagline?: string | null;
  heroHeading?: string | null;
  heroSubtitle?: string | null;
  heroDescription?: string | null;
  heroShowGrid?: boolean;
  heroShowDivider?: boolean;
}

export async function BlogListing({ searchParams, basePath = "/blog", heroTitle, heroImageUrl, heroTagline, heroHeading, heroSubtitle, heroDescription, heroShowGrid, heroShowDivider }: BlogListingProps) {
  const params = searchParams || {};
  const page = parseInt(params.page || "1");
  const pageSize = 9;
  const categorySlug = params.category || "";
  const tagSlug = params.tag || "";
  const search = params.search || "";
  const sort: "newest" | "oldest" = params.sort === "oldest" ? "oldest" : "newest";

  // Build a URL for this listing, preserving the current filters/sort and
  // applying the given overrides. Pass `undefined` to drop a param.
  const buildUrl = (
    overrides: Record<string, string | number | undefined> = {},
    hash = ""
  ) => {
    const current: Record<string, string> = {};
    if (categorySlug) current.category = categorySlug;
    if (tagSlug) current.tag = tagSlug;
    if (search) current.search = search;
    if (sort !== "newest") current.sort = sort;
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        delete current[key];
      } else {
        current[key] = String(value);
      }
    }
    const qs = new URLSearchParams(current).toString();
    return `${basePath}${qs ? `?${qs}` : ""}${hash}`;
  };

  const where: Record<string, unknown> = {
    isPublished: true,
    deletedAt: null,
  };
  if (categorySlug) {
    where.categories = { some: { category: { slug: categorySlug } } };
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
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        categories: { include: { category: { select: { id: true, name: true, slug: true, color: true } } } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true, color: true } } } },
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.blogPost.count({ where }),
    prisma.blogCategory.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Page numbers to display: up to 3 in either direction of the current page.
  const windowStart = Math.max(1, page - 3);
  const windowEnd = Math.min(totalPages, page + 3);
  const pageNumbers: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);

  return (
    <div className="bg-[#f5f5f3] min-h-screen">
      {/* Hero */}
      <PageHero
        title={heroTitle || "Partner Thoughts"}
        imageUrl={heroImageUrl}
        tagline={heroTagline}
        heading={heroHeading}
        subtitle={heroSubtitle}
        description={heroDescription}
        showGrid={heroShowGrid}
        showDivider={heroShowDivider}
      />

      <div className="max-w-6xl mx-auto px-16 py-12">
        {/* Filters */}
        <div id="blog-filters" className="flex flex-wrap items-center gap-3 mb-8" style={{ scrollMarginTop: "80px" }}>
          <Link
            href={buildUrl({ category: undefined, tag: undefined, page: undefined }, "#blog-filters")}
            scroll={false}
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
              href={buildUrl({ category: cat.slug, tag: undefined, page: undefined }, "#blog-filters")}
              scroll={false}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                categorySlug === cat.slug
                  ? "bg-[#1A2640] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              {cat.name}
            </Link>
          ))}
          <BlogSortSelect
            sort={sort}
            newestHref={buildUrl({ sort: undefined, page: undefined }, "#blog-filters")}
            oldestHref={buildUrl({ sort: "oldest", page: undefined }, "#blog-filters")}
          />
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
                className="group blog-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {post.heroImageUrl ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  {post.categories && post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.categories.map((pc: { category: { id: string; name: string; color: string | null } }) => (
                        <span
                          key={pc.category.id}
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (pc.category.color || "#B07D3A") + "20",
                            color: pc.category.color || "#B07D3A",
                          }}
                        >
                          {pc.category.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2
                    className="mt-2 group-hover:text-[#B07D3A] transition-colors line-clamp-2"
                    style={{
                      fontFamily: "var(--font-blog-card-title-family, 'Inter', sans-serif)",
                      fontWeight: "var(--font-blog-card-title-weight, 600)" as unknown as number,
                      fontStyle: "var(--font-blog-card-title-style, normal)",
                      fontSize: "var(--font-blog-card-title-size, 24px)",
                      color: "var(--font-blog-card-title-color, #1A2640)",
                    }}
                  >
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p
                      className="mt-2 line-clamp-3"
                      style={{
                        fontFamily: "var(--font-blog-card-excerpt-family, 'Inter', sans-serif)",
                        fontWeight: "var(--font-blog-card-excerpt-weight, 400)" as unknown as number,
                        fontStyle: "var(--font-blog-card-excerpt-style, normal)",
                        fontSize: "var(--font-blog-card-excerpt-size, 18px)",
                        color: "var(--font-blog-card-excerpt-color, #666666)",
                      }}
                    >
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
          <div className="flex flex-wrap justify-center items-center gap-2 mt-12">
            {page > 1 && (
              <Link
                href={buildUrl({ page: page - 1 === 1 ? undefined : page - 1 })}
                className="px-4 py-2 text-sm rounded-lg border bg-white text-gray-600 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {pageNumbers.map((p) => (
              <Link
                key={p}
                href={buildUrl({ page: p === 1 ? undefined : p })}
                aria-current={p === page ? "page" : undefined}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  p === page
                    ? "bg-[#1A2640] text-white border-[#1A2640]"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: page + 1 })}
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
                  href={buildUrl({ tag: tag.slug, category: undefined, page: undefined })}
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

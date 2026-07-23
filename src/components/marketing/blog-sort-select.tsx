"use client";

import { useRouter } from "next/navigation";

interface BlogSortSelectProps {
  sort: "newest" | "oldest";
  newestHref: string;
  oldestHref: string;
}

export function BlogSortSelect({ sort, newestHref, oldestHref }: BlogSortSelectProps) {
  const router = useRouter();

  return (
    <div className="ml-auto flex items-center gap-2">
      <label htmlFor="blog-sort" className="text-sm text-gray-500">
        Sort
      </label>
      <select
        id="blog-sort"
        value={sort}
        onChange={(e) => router.push(e.target.value === "oldest" ? oldestHref : newestHref)}
        className="px-3 py-1.5 text-sm rounded-full border bg-white text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B07D3A]/40"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>
  );
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItem {
  href: string
  label: string
  countKey?: string
  showCountWhenZero?: boolean
}

interface SidebarCounts {
  clientCount: number
  investmentCount: number
  distributionCount: number
  assetClassCount: number
  documentCount: number
  advisorCount: number
  ticketCount: number
  accessRequestCount: number
  verificationCount: number
  pageCount: number
  blogPostCount: number
  blogCategoryCount: number
  mediaCount: number
  messageCount: number
  statementCount: number
}

const manageNav: NavItem[] = [
  { href: "/admin", label: "Clients", countKey: "clientCount", showCountWhenZero: true },
  { href: "/admin/investments", label: "Investments", countKey: "investmentCount", showCountWhenZero: true },
  { href: "/admin/distributions", label: "Distributions", countKey: "distributionCount", showCountWhenZero: true },
  { href: "/admin/asset-classes", label: "Asset Classes", countKey: "assetClassCount", showCountWhenZero: true },
  { href: "/admin/documents", label: "Documents", countKey: "documentCount", showCountWhenZero: true },
  { href: "/admin/advisors", label: "Advisors", countKey: "advisorCount", showCountWhenZero: true },
  { href: "/admin/activity", label: "Communications", countKey: "messageCount" },
  { href: "/admin/support", label: "Support", countKey: "ticketCount" },
  { href: "/admin/access-requests", label: "Access Requests", countKey: "accessRequestCount" },
  { href: "/admin/verifications", label: "Verifications", countKey: "verificationCount" },
  { href: "/admin/statements", label: "Statements", countKey: "statementCount" },
]

const websiteNav: NavItem[] = [
  { href: "/admin/pages", label: "Pages", countKey: "pageCount", showCountWhenZero: true },
  { href: "/admin/blog", label: "Blog Posts", countKey: "blogPostCount", showCountWhenZero: true },
  { href: "/admin/blog/categories", label: "Blog Categories", countKey: "blogCategoryCount", showCountWhenZero: true },
  { href: "/admin/media", label: "Media Library", countKey: "mediaCount", showCountWhenZero: true },
  { href: "/admin/footer", label: "Footer" },
  { href: "/admin/brand-palette", label: "Brand Palette" },
]

const systemNav: NavItem[] = [
  { href: "/admin/users", label: "Admin Users" },
  { href: "/admin/audit-log", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname.startsWith(href)
}

export function SidebarNav() {
  const pathname = usePathname()
  const [counts, setCounts] = useState<SidebarCounts | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/admin/sidebar-counts")
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setCounts(data)
      } catch {
        // Non-critical
      }
    }
    Promise.resolve().then(load)
    return () => { cancelled = true }
  }, [pathname])

  function getCount(item: NavItem): number | undefined {
    if (!item.countKey || !counts) return undefined
    const val = counts[item.countKey as keyof SidebarCounts]
    if (val === 0 && !item.showCountWhenZero) return undefined
    return val
  }

  return (
    <nav className="flex-1 px-4">
      {/* MANAGE section */}
      <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
        Manage
      </p>
      <ul className="space-y-0.5 mb-6">
        {manageNav.map((item) => {
          const count = getCount(item)
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                  active
                    ? "text-[#E8D5B0] bg-white/10"
                    : "text-white/55 hover:text-[#E8D5B0] hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#B07D3A]" : "bg-current opacity-60"}`} />
                  {item.label}
                </span>
                {count !== undefined && (
                  <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full tabular-nums">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* WEBSITE section */}
      <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
        Website
      </p>
      <ul className="space-y-0.5 mb-6">
        {websiteNav.map((item) => {
          const count = getCount(item)
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                  active
                    ? "text-[#E8D5B0] bg-white/10"
                    : "text-white/55 hover:text-[#E8D5B0] hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#B07D3A]" : "bg-current opacity-60"}`} />
                  {item.label}
                </span>
                {count !== undefined && (
                  <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full tabular-nums">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* SYSTEM section */}
      <p className="text-[10px] font-semibold text-white/25 tracking-widest uppercase mb-3 px-3">
        System
      </p>
      <ul className="space-y-0.5 mb-6">
        {systemNav.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  active
                    ? "text-[#E8D5B0] bg-white/10"
                    : "text-white/55 hover:text-[#E8D5B0] hover:bg-white/5"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#B07D3A]" : "bg-current opacity-60"}`} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Back to portal */}
      <div className="px-3 pt-4 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/40 hover:text-white/60 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          Back to Portal
        </Link>
        <Link
          href="/signout"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-md text-white/55 hover:text-red-300 hover:bg-white/5 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
          Log Out
        </Link>
      </div>
    </nav>
  )
}

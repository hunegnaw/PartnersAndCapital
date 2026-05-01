# CMS Page Settings: Navigation Visibility + Blog Page Designation

## Context

The public site navigation (header + footer) currently has hardcoded links: Home, Partner Thoughts, Contact. There's no way for admins to control which pages appear in the nav, and no way to designate which CMS page should host the blog listing. We need two new Page fields:

1. **Show in Navigation** — toggle a page into the public header/footer nav
2. **Blog Page** — mark one page as the blog page (like `isHomepage`, only one at a time), so the blog listing renders on that page's URL and it appears correctly in nav

Additionally, a `navOrder` field to control the sort order of nav items.

---

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `showInNav`, `navLabel`, `navOrder`, `isBlogPage` fields to Page model |
| `src/components/marketing/header.tsx` | Fetch nav pages from DB instead of hardcoded array |
| `src/components/marketing/footer.tsx` | Same — fetch nav pages from DB |
| `src/app/(marketing)/[slug]/page.tsx` | If page `isBlogPage`, render blog listing instead of blocks |
| `src/app/(admin)/admin/pages/new/page.tsx` | Add "Show in Navigation", "Nav Label", "Nav Order", "Set as blog page" controls |
| `src/app/(admin)/admin/pages/[id]/edit/page.tsx` | Same controls in edit form |
| `src/app/(admin)/admin/pages/page.tsx` | Add Nav + Blog columns to the table |
| `src/app/api/admin/pages/route.ts` | Accept new fields in POST |
| `src/app/api/admin/pages/[id]/route.ts` | Accept new fields in PATCH, handle `isBlogPage` uniqueness (like `isHomepage`) |
| `MANUAL.md` | Document new page settings |

---

## Implementation

### Phase 1: Schema Migration

Add to the `Page` model in `prisma/schema.prisma`:

```prisma
showInNav   Boolean   @default(false)
navLabel    String?                     // Override display label in nav (defaults to title)
navOrder    Int       @default(0)       // Sort order in nav (lower = first)
isBlogPage  Boolean   @default(false)   // Only one page can be the blog page

@@index([showInNav])
@@index([isBlogPage])
```

Run `npx prisma migrate dev --name add-page-nav-and-blog-fields`.

### Phase 2: API Routes

**POST `/api/admin/pages`** — accept `showInNav`, `navLabel`, `navOrder`, `isBlogPage`. If `isBlogPage` is true, unset any existing blog page (same pattern as `isHomepage`).

**PATCH `/api/admin/pages/[id]`** — same fields. Add `isBlogPage` uniqueness logic inside the existing transaction.

### Phase 3: Admin UI

**New Page + Edit Page forms** — add to the Settings sidebar card:

- Checkbox: "Show in navigation"
- Conditional input: "Nav label" (only visible when showInNav is checked, placeholder: "Defaults to page title")
- Conditional input: "Nav order" (number, only visible when showInNav is checked)
- Checkbox: "Set as blog page"

**Pages list table** — add two indicator columns:
- "Nav" column with a navigation icon (like the Home star column)
- "Blog" column with a blog icon

### Phase 4: Dynamic Navigation

Replace hardcoded nav arrays in **header.tsx** and **footer.tsx**.

Both components become async server components. They query:

```ts
const navPages = await prisma.page.findMany({
  where: { showInNav: true, status: "PUBLISHED", deletedAt: null },
  select: { slug: true, title: true, navLabel: true, navOrder: true, isHomepage: true, isBlogPage: true },
  orderBy: { navOrder: "asc" },
});
```

Build the nav array from results:
- `isHomepage` pages link to `/`
- `isBlogPage` pages link to `/blog`
- All others link to `/${slug}`
- Display `navLabel || title`

The header keeps "Investor Login" as a separate styled button (not from DB). The footer adds "Investor Login" at the end of the DB-driven links.

### Phase 5: Blog Page Rendering

In `src/app/(marketing)/[slug]/page.tsx`, after fetching the page, check `isBlogPage`. If true, render the blog listing component instead of BlockRenderer. Import and reuse the existing blog listing logic from `src/app/(marketing)/blog/page.tsx` — extract the blog listing into a shared component or inline the query.

The existing `/blog` route stays as a fallback/redirect if someone visits it directly.

---

## Verification

1. `npx prisma migrate dev` runs clean
2. `npm run build` passes
3. Admin creates a page, checks "Show in navigation" — it appears in the public header/footer
4. Admin checks "Set as blog page" on a page — visiting that page's slug shows the blog listing
5. Nav order controls the display sequence
6. Only one page can be blog page at a time (toggling unsets the previous)
7. Unchecking "Show in navigation" removes the page from nav
8. MANUAL.md updated
9. Commit and push

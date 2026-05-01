# Page Hero Images + Typography/Font Settings System

## Context
Two features requested:
1. **Page hero banners**: Every page and blog post (except homepage) should display a 600px-tall hero image with centered white title. Pages currently have no featured image field — heroes are block-level only. Blog posts already have `heroImageUrl`.
2. **Typography settings**: Admin-configurable fonts, weights, styles, and colors for every text category on the site (hero titles, subtitles, body, admin, portal). Google Fonts picker. Currently fonts are hardcoded to Geist via `next/font/google`.

---

## Part 1: Page Hero Images

### 1A. Prisma schema — add `featuredImageUrl` to Page
**File:** `prisma/schema.prisma`
- Add `featuredImageUrl String?` to the `Page` model (right after `isBlogPage`)

Run `npx prisma db push` to apply.

### 1B. Admin page editors — add Hero Image card
**Files:**
- `src/app/(admin)/admin/pages/[id]/edit/page.tsx`
- `src/app/(admin)/admin/pages/new/page.tsx`

Add a "Hero Image" card in the sidebar (between Settings and SEO), matching the blog editor pattern:
- `featuredImageUrl` state
- MediaPicker integration with preview + clear button
- Send `featuredImageUrl` in form submission payload

### 1C. Page API routes — accept `featuredImageUrl`
**Files:**
- `src/app/api/admin/pages/route.ts` (POST) — add to create data
- `src/app/api/admin/pages/[id]/route.ts` (PATCH) — add conditional update

### 1D. Public page rendering — hero banner component
**New file:** `src/components/marketing/page-hero.tsx`

A shared `PageHero` component:
- 600px tall (`h-[600px]`)
- If `imageUrl` provided: full-bleed background image with dark overlay
- If no image: solid dark navy background (`#1A2640`)
- Page title centered horizontally and vertically, white, large font
- Used for both CMS pages and blog posts

### 1E. Public [slug] page — render hero
**File:** `src/app/(marketing)/[slug]/page.tsx`
- Fetch `featuredImageUrl` and `isHomepage` from DB
- If not homepage and not blog-page: render `<PageHero>` above `<BlockRenderer>`
- Blog listing pages also get a hero

### 1F. Public blog/[slug] page — use PageHero
**File:** `src/app/(marketing)/blog/[slug]/page.tsx`
- Replace inline hero markup with `<PageHero>` component for consistency
- Pass `heroImageUrl` and `title` to `PageHero`

### 1G. Homepage — no hero
**File:** `src/app/page.tsx` — no changes needed, homepage renders blocks only (hero is a block if wanted)

---

## Part 2: Typography & Color Settings

### 2A. Data model — add `typography` JSON field
**File:** `prisma/schema.prisma`
- Add `typography Json?` to Organization model

**Shape stored in JSON:**
```json
{
  "heroTitle":   { "fontFamily": "Playfair Display", "fontWeight": "700", "fontStyle": "normal", "color": "#ffffff", "fontSize": "48px" },
  "subtitle":    { "fontFamily": "Open Sans",        "fontWeight": "600", "fontStyle": "normal", "color": "#1A2640", "fontSize": "24px" },
  "body":        { "fontFamily": "Open Sans",        "fontWeight": "400", "fontStyle": "normal", "color": "#333333", "fontSize": "16px" },
  "adminBody":   { "fontFamily": "Inter",            "fontWeight": "400", "fontStyle": "normal", "color": "#333333", "fontSize": "14px" },
  "portalBody":  { "fontFamily": "Inter",            "fontWeight": "400", "fontStyle": "normal", "color": "#333333", "fontSize": "14px" }
}
```

Five categories, each with: fontFamily, fontWeight, fontStyle, color, fontSize.

### 2B. Google Fonts list
**New file:** `src/lib/google-fonts.ts`
- Curated list of ~80 popular Google Fonts (names only) — avoids needing a Google API key
- Export a helper `buildGoogleFontsUrl(families: string[])` that returns a `fonts.googleapis.com` URL for `<link>` injection

### 2C. Admin settings UI — Typography card
**File:** `src/app/(admin)/admin/settings/page.tsx`
- Add a new "Typography" card (after Branding, before Contact)
- For each of the 5 categories, render a `FontSettingRow` with:
  - **Font Family**: searchable select/combobox from curated Google Fonts list
  - **Font Weight**: select (100–900)
  - **Font Style**: select (normal / italic)
  - **Color**: hex input with color swatch preview (same pattern as brand colors)
  - **Font Size**: input (e.g. "48px", "16px")
- Live preview text beside each row showing the selected styling
- State stored as a single `typography` object, sent in PATCH payload

### 2D. Settings API — accept `typography`
**File:** `src/app/api/admin/settings/route.ts`
- Add `typography` to destructured body fields
- Add conditional update for typography

### 2E. Organization provider — expose typography
**File:** `src/components/providers/organization-provider.tsx`
- Add `typography` to `OrgConfig` interface with the 5-category shape
- Fetch and expose via context
- Provide sensible defaults (Geist Sans / current hardcoded values)

### 2F. Dynamic font loading component
**New file:** `src/components/providers/font-loader.tsx`
- Client component that reads `typography` from `useOrganization()`
- Collects unique font families from all 5 categories
- Injects a `<link>` tag into `<head>` pointing to `fonts.googleapis.com/css2?family=...&display=swap`
- Injects a `<style>` tag setting CSS custom properties:
  ```css
  :root {
    --font-hero-title: 'Playfair Display', serif;
    --font-hero-title-weight: 700;
    --font-hero-title-style: normal;
    --font-hero-title-color: #ffffff;
    --font-hero-title-size: 48px;
    --font-subtitle: 'Open Sans', sans-serif;
    /* ... etc for all 5 categories */
  }
  ```

### 2G. Root layout — include FontLoader
**File:** `src/app/layout.tsx`
- Keep Geist as fallback (loaded at build time)
- Add `<FontLoader />` inside `<OrganizationProvider>` so dynamic fonts are loaded client-side on top

### 2H. Apply CSS variables throughout the site
Apply the CSS custom properties in key locations:

- **PageHero** (`src/components/marketing/page-hero.tsx`): use `--font-hero-title` variables for the title
- **Marketing pages** (`globals.css` or marketing layout): use `--font-body` for body text, `--font-subtitle` for h2/h3
- **Admin layout** (`src/app/(admin)/admin/layout.tsx`): use `--font-admin-body`
- **Portal layout** (`src/app/(portal)/layout.tsx`): use `--font-portal-body`
- Blog post headings, text sections, etc. inherit from these variables

The CSS variables are set by the FontLoader at runtime. Components reference them via `style` props or Tailwind arbitrary values.

---

## Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `featuredImageUrl` to Page, `typography` to Organization |
| `src/app/api/admin/pages/route.ts` | Accept `featuredImageUrl` in POST |
| `src/app/api/admin/pages/[id]/route.ts` | Accept `featuredImageUrl` in PATCH |
| `src/app/api/admin/settings/route.ts` | Accept `typography` in PATCH |
| `src/app/(admin)/admin/pages/new/page.tsx` | Add Hero Image card with MediaPicker |
| `src/app/(admin)/admin/pages/[id]/edit/page.tsx` | Add Hero Image card with MediaPicker |
| `src/app/(admin)/admin/settings/page.tsx` | Add Typography card with font/color/weight pickers |
| `src/components/marketing/page-hero.tsx` | **New** — shared 600px hero banner component |
| `src/app/(marketing)/[slug]/page.tsx` | Render PageHero for non-homepage pages |
| `src/app/(marketing)/blog/[slug]/page.tsx` | Use PageHero component |
| `src/lib/google-fonts.ts` | **New** — curated font list + URL builder |
| `src/components/providers/organization-provider.tsx` | Add typography to context |
| `src/components/providers/font-loader.tsx` | **New** — dynamic Google Fonts + CSS vars injection |
| `src/app/layout.tsx` | Include FontLoader |
| `src/app/(admin)/admin/layout.tsx` | Apply admin font variable |
| `src/app/(portal)/layout.tsx` | Apply portal font variable |
| `MANUAL.md` | Document both features |

---

## Verification
1. `npx prisma db push` succeeds
2. `npm run build` passes
3. Admin: create/edit page — Hero Image card shows with MediaPicker
4. Public: non-homepage page shows 600px hero with image + centered white title
5. Public: blog post uses same PageHero component
6. Homepage: no hero added (blocks render as before)
7. Admin Settings: Typography card shows 5 font categories with Google Fonts picker, weight, style, color, size
8. Save typography settings — fonts load dynamically on public site
9. Hero title, subtitles, body, admin, and portal text all reflect configured fonts/colors

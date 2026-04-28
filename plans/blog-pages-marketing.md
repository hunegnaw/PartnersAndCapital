# Public Website: Blog + Page Builder + Marketing Site

## Context

Partners + Capital currently runs their public website on Squarespace (partnersandcapital.com). The investor portal we built is becoming a SaaS product on a separate domain. This plan adds a blog system (like KWBT), a page builder (like WordPress), and a public marketing layout to the existing Next.js app — replacing the Squarespace site entirely.

The root route (`/`) currently just redirects based on auth role. It will become the public homepage, rendered by the page builder.

---

## Phase 1: Dependencies + Schema

### NPM Packages

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline \
  @tiptap/extension-text-align @tiptap/extension-link @tiptap/extension-image \
  @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-table \
  @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sharp
```

Add `@plugin "@tailwindcss/typography"` to `globals.css` (Tailwind v4 pattern) — install `@tailwindcss/typography` too.

### Prisma Schema Additions (`prisma/schema.prisma`)

**9 new models + 2 User relations:**

| Model | Purpose |
|-------|---------|
| `Media` | Public images/videos (fileName, filePath, fileSize, mimeType, width, height, alt, caption) |
| `BlogPost` | Blog articles (title, slug, content as LongText HTML, excerpt, hero image, SEO fields, viewCount, readTime, publishedAt, isPublished/isDraft) |
| `BlogCategory` | Post categories (name, slug, color, sortOrder) |
| `BlogTag` | Post tags (name, slug, color) |
| `BlogPostTag` | Junction table (postId + tagId, unique constraint) |
| `Page` | CMS pages (title, slug, status DRAFT/PUBLISHED/ARCHIVED, isHomepage flag, SEO fields) |
| `PageBlock` | Page content blocks (pageId, type string, props JSON, sortOrder, optional mediaId) |
| `ContactSubmission` | Contact form entries (name, email, message, ipAddress) |
| `NewsletterSubscriber` | Email signups (email unique, subscribedAt, unsubscribedAt) |

Add to User model: `mediaUploads Media[]` and `blogPosts BlogPost[]`

**Migration:** `npx prisma migrate dev --name add-blog-pages-media`

---

## Phase 2: Media Library

### Files
- `src/lib/media-upload.ts` — Save to `public/uploads/media/YYYY/{uuid}.{ext}` (NO encryption, these are public). Max 10MB images, 100MB video. Use `sharp` for dimension extraction.
- `src/app/api/admin/media/route.ts` — GET (list, paginated, search, filter by type), POST (multipart upload)
- `src/app/api/admin/media/[id]/route.ts` — GET, PATCH (alt/caption), DELETE (soft)
- `src/components/admin/media-picker.tsx` — Dialog with grid of thumbnails, search, upload tab, returns selected Media object
- `src/app/(admin)/admin/media/page.tsx` — Full media browser page
- `next.config.ts` — Add `images.localPatterns` for `/uploads/media/`

---

## Phase 3: Tiptap Rich Text Editor

### Files
- `src/components/admin/rich-text-editor.tsx` — Adapted from KWBT. Toolbar: Bold, Italic, Underline, Strikethrough | H1-H3 | Lists | Alignment | Colors (navy, gold, dark, white) | Link, Image (opens MediaPicker) | Blockquote, Code block | Table | Undo/Redo | Source toggle
- `src/components/admin/tiptap-image-extension.ts` — Custom image extension that opens MediaPicker instead of URL prompt

---

## Phase 4: Blog System

### Admin API Routes
| Route | Methods |
|-------|---------|
| `src/app/api/admin/blog/route.ts` | GET (list, paginated, search, status/category filter), POST (create) |
| `src/app/api/admin/blog/[id]/route.ts` | GET, PATCH, DELETE (soft) |
| `src/app/api/admin/blog/categories/route.ts` | GET, POST |
| `src/app/api/admin/blog/categories/[id]/route.ts` | PATCH, DELETE (soft) |
| `src/app/api/admin/blog/tags/route.ts` | GET, POST |
| `src/app/api/admin/blog/tags/[id]/route.ts` | PATCH, DELETE |

### Public API Routes
| Route | Methods |
|-------|---------|
| `src/app/api/blog/route.ts` | GET (published posts, paginated, category/tag/search filters) |
| `src/app/api/blog/[slug]/route.ts` | GET (single post, increment viewCount) |
| `src/app/api/blog/recent/route.ts` | GET (3 most recent for footer) |

### Admin Pages
- `src/app/(admin)/admin/blog/page.tsx` — Post list with search, status filter, category filter, pagination, actions
- `src/app/(admin)/admin/blog/new/page.tsx` — Create post: main area (excerpt + Tiptap editor) + sidebar (category, tags, hero image via MediaPicker, SEO tab, settings tab)
- `src/app/(admin)/admin/blog/[id]/edit/page.tsx` — Edit post (same form, pre-populated)
- `src/app/(admin)/admin/blog/categories/page.tsx` — Category CRUD with color picker

### Public Pages
- `src/app/(marketing)/blog/page.tsx` — 3-column grid, 9/page, category pills, tag sidebar, search, pagination. Navy/gold/cream theme.
- `src/app/(marketing)/blog/[slug]/page.tsx` — Hero image, breadcrumbs, prose content, tags, related posts, share button, view count. `generateMetadata()` for SEO.
- `src/components/blog/share-button.tsx` — Copy link + native share API

---

## Phase 5: Page Builder

### Block Types (`src/lib/page-blocks.ts`)

| Type | Description | Key Props |
|------|-------------|-----------|
| `hero_video` | Video background + overlay text | videoUrl, posterImageUrl, heading, subheading, ctaText, ctaUrl, overlayOpacity |
| `hero_image` | Image background + overlay text | imageUrl, heading, subheading, ctaText, ctaUrl, overlayOpacity |
| `text_section` | Rich text content | content (HTML), maxWidth, backgroundColor, textColor, paddingY |
| `logo_gallery` | Grid of logos/images | heading, logos[], columns, grayscale |
| `stats` | Number cards row | heading, stats[{value, label}], backgroundColor |
| `cta_banner` | Full-width CTA | heading, text, ctaText, ctaUrl, backgroundColor |
| `two_column` | Side-by-side content | leftContent, rightContent, leftWidth |
| `contact_form` | Name/email/message form | heading, description, showAddress, showEmail |
| `newsletter_signup` | Email signup | heading, description, backgroundColor |
| `quote` | Blockquote | text, attribution, role |
| `image` | Single image | imageUrl, alt, caption, maxWidth |
| `embed` | YouTube/Vimeo | url, title, aspectRatio |
| `spacer` | Vertical space | height (sm/md/lg/xl) |

### Block Renderer Components (`src/components/blocks/`)
- `block-renderer.tsx` — Maps block type string to component
- One component per block type (13 files): `hero-video-block.tsx`, `hero-image-block.tsx`, `text-section-block.tsx`, `logo-gallery-block.tsx`, `stats-block.tsx`, `cta-banner-block.tsx`, `two-column-block.tsx`, `contact-form-block.tsx`, `newsletter-signup-block.tsx`, `quote-block.tsx`, `image-block.tsx`, `embed-block.tsx`, `spacer-block.tsx`

### Admin Page Editor
- `src/app/api/admin/pages/route.ts` — GET list, POST create
- `src/app/api/admin/pages/[id]/route.ts` — GET (with blocks), PATCH, DELETE (soft)
- `src/app/(admin)/admin/pages/page.tsx` — Page list
- `src/app/(admin)/admin/pages/new/page.tsx` — Create page
- `src/app/(admin)/admin/pages/[id]/edit/page.tsx` — Edit page with block editor
- `src/components/admin/block-editor.tsx` — Drag-and-drop block list (@dnd-kit/sortable)
- `src/components/admin/block-type-picker.tsx` — Grid of block types with icons
- `src/components/admin/block-editor-form.tsx` — Dynamic form per block type (MediaPicker for images/videos, Tiptap for rich text fields, inputs for text)

PATCH saves page metadata + full blocks array atomically (transaction: delete all existing blocks, create new ones).

---

## Phase 6: Marketing Layout + Public Pages

### Layout (`src/app/(marketing)/layout.tsx`)
No auth required. Wraps all public pages.

### Header (`src/components/marketing/header.tsx`)
- Sticky dark navy bar (`bg-[#0f1c2e]`)
- Left: "PARTNERS + CAPITAL" logo
- Center: Home, Partner Thoughts, Contact
- Right: **Login button with LogIn icon** (gold outline, Lucide `LogIn` icon + "Investor Login" text, links to `/login`)
- Mobile hamburger menu
- Transparent-to-solid scroll effect on homepage

### Footer (`src/components/marketing/footer.tsx`)
- Dark navy background
- Newsletter signup form
- Nav links
- Legal disclaimer (from Organization.disclaimer)
- Address: 605 N High St Suite 212, Columbus OH 43215
- Email: david@partnersandcapital.com
- Copyright: 2015-{year} Partners + Capital, LLC

### Public Contact/Newsletter APIs
- `src/app/api/contact/route.ts` — POST, rate-limited, creates ContactSubmission, sends email notification to org email
- `src/app/api/newsletter/route.ts` — POST, upserts NewsletterSubscriber

### Root Page Change (`src/app/page.tsx`)
Rewrite to: Query `Page` where `isHomepage = true, status = PUBLISHED`, load blocks, render with `BlockRenderer` inside marketing layout. If authenticated, show a small floating "Go to Portal" button. If no homepage exists, redirect to `/login` as fallback.

### Dynamic Pages (`src/app/(marketing)/[slug]/page.tsx`)
Catch-all: query Page by slug, render blocks. 404 if not found. `generateMetadata()` from page SEO fields.

---

## Phase 7: Admin Sidebar Update

**Modify:** `src/app/(admin)/admin/layout.tsx`

Add "WEBSITE" section between MANAGE and SYSTEM:

```
WEBSITE
  Pages (count)
  Blog Posts (count)
  Blog Categories
  Media Library (count)
```

Fetch counts: `prisma.page.count()`, `prisma.blogPost.count()`, `prisma.media.count()`

---

## Phase 8: Seed Data

### Homepage (Page with blocks)
1. `hero_video` — "PUBLIC ACCESS TO PRIVATE MARKETS" / "Your grandparents had a house. Your parents had a 401(k). You have access." / CTA: "Request an Introduction" → /contact
2. `text_section` — Value proposition text
3. `stats` — Portfolio stats (80+ companies, asset classes)
4. `logo_gallery` — Portfolio company logos (placeholder images)
5. `quote` — "We are bound together by shared values and shared value creation"
6. `text_section` — Mission statement
7. `cta_banner` — "Sign up to receive news and updates"
8. `newsletter_signup`

### Contact Page
1. `hero_image` — "Request an Introduction"
2. `contact_form` — With address and email shown

### Blog Posts (11 articles from Squarespace)
Seed all 11 Partner Thoughts posts with titles, slugs, excerpts, published dates, and placeholder content. Categories: "Investments", "Market Insights", "Company Updates". Tags: biochar, oil-gas, real-estate, private-credit, consumer-products, etc.

---

## Phase 9: CSS + Config Updates

- `src/app/globals.css` — Add `@plugin "@tailwindcss/typography"` for prose styles
- `next.config.ts` — Add image config for local uploads directory

---

## Complete File List

### New Files (~55)

**Lib:** `media-upload.ts`, `page-blocks.ts`
**Admin API (Blog):** `admin/blog/route.ts`, `admin/blog/[id]/route.ts`, `admin/blog/categories/route.ts`, `admin/blog/categories/[id]/route.ts`, `admin/blog/tags/route.ts`, `admin/blog/tags/[id]/route.ts`
**Public API (Blog):** `blog/route.ts`, `blog/[slug]/route.ts`, `blog/recent/route.ts`
**Admin API (Pages):** `admin/pages/route.ts`, `admin/pages/[id]/route.ts`
**Admin API (Media):** `admin/media/route.ts`, `admin/media/[id]/route.ts`
**Public API:** `contact/route.ts`, `newsletter/route.ts`
**Admin Pages:** `admin/blog/page.tsx`, `admin/blog/new/page.tsx`, `admin/blog/[id]/edit/page.tsx`, `admin/blog/categories/page.tsx`, `admin/pages/page.tsx`, `admin/pages/new/page.tsx`, `admin/pages/[id]/edit/page.tsx`, `admin/media/page.tsx`
**Marketing Pages:** `(marketing)/layout.tsx`, `(marketing)/blog/page.tsx`, `(marketing)/blog/[slug]/page.tsx`, `(marketing)/[slug]/page.tsx`
**Components (Admin):** `rich-text-editor.tsx`, `tiptap-image-extension.ts`, `media-picker.tsx`, `block-editor.tsx`, `block-type-picker.tsx`, `block-editor-form.tsx`
**Components (Marketing):** `header.tsx`, `footer.tsx`
**Components (Blog):** `share-button.tsx`
**Components (Blocks):** `block-renderer.tsx` + 13 block components

### Modified Files (~7)
- `prisma/schema.prisma` — Add 9 models + User relations
- `prisma/seed.ts` — Add homepage, contact page, blog posts, categories, tags
- `src/app/page.tsx` — Rewrite from auth-redirect to homepage renderer
- `src/app/(admin)/admin/layout.tsx` — Add WEBSITE nav section
- `src/app/globals.css` — Add typography plugin
- `next.config.ts` — Add image config
- `package.json` — New dependencies

---

## Verification

1. `npm run build` passes with zero errors
2. Public `/` shows homepage with video hero, stats, logos, CTA
3. Public `/blog` shows post listing with filters and pagination
4. Public `/blog/{slug}` shows full post with SEO metadata
5. Public `/contact` shows contact form
6. Marketing header has "Investor Login" button with LogIn icon
7. Admin `/admin/blog` — full CRUD for posts
8. Admin `/admin/pages` — page builder with drag-and-drop blocks
9. Admin `/admin/media` — upload/browse/delete media
10. Admin sidebar shows WEBSITE section between MANAGE and SYSTEM
11. Portal pages (`/dashboard`, `/admin`) unaffected — still use their own layouts
12. Commit and push

# Partners + Capital -- Instruction Manual

This manual covers setup, administration, and usage of the Partners + Capital investor portal.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Guide](#admin-guide)
3. [Public Website](#public-website)
4. [Blog System](#blog-system)
5. [Page Builder](#page-builder)
6. [Media Library](#media-library)
7. [Client Portal Guide](#client-portal-guide)
8. [Support Ticket System](#support-ticket-system)
9. [Advisor Access](#advisor-access)
10. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
11. [Default Credentials](#default-credentials)
12. [Deployment Basics](#deployment-basics)
13. [Production Seeding](#production-seeding)
14. [Troubleshooting](#troubleshooting)
15. [Admin "View as Client"](#admin-view-as-client-impersonation)
16. [Custom Document Types](#custom-document-types)
17. [Distribution Management](#distribution-management)
18. [Soft Delete (Investments & Clients)](#soft-delete-investments--clients)
19. [Delete Client Positions](#delete-client-positions)
20. [Access Requests](#access-requests)
21. [Tax Center](#tax-center)
22. [Secure Communications](#secure-communications)
23. [Feature Roadmap](#feature-roadmap)

---

## Getting Started

### System Requirements

- **Node.js**: 20 or later
- **MySQL**: 8.0+ (or MariaDB 10.6+)
- **npm**: Included with Node.js
- **PM2**: Required for production process management (`npm install -g pm2`)

### Initial Setup

1. **Clone the repository**

   ```bash
   git clone git@github.com:hunegnaw/PartnersAndCapital.git partnersandcapital.com
   cd partnersandcapital.com
   ```

2. **Create the environment file**

   ```bash
   cp .env.example .env
   ```

3. **Configure the environment**

   Open `.env` in a text editor and set the following values:

   - `DATABASE_URL` -- Your MySQL connection string in the format:
     ```
     mysql://username:password@hostname:3306/database_name
     ```
   - `NEXTAUTH_SECRET` -- A random string used for signing JWTs. Generate one with:
     ```bash
     openssl rand -base64 32
     ```
   - `NEXTAUTH_URL` -- The URL where the application will run (e.g., `http://localhost:3000` for local development).

4. **Run the setup script**

   ```bash
   ./scripts/setup.sh
   ```

   This script will:
   - Install all npm dependencies
   - Generate the Prisma client
   - Run database migrations to create all tables
   - Seed the database with a default admin user, organization, and asset classes
   - Create necessary upload directories

   If you prefer to run steps individually:

   ```bash
   npm install
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Admin Guide

### Login Page

The login page at `/login` uses the standard marketing header, footer, and typography -- matching the rest of the public site. Below the sign-in form, a navy stats bar displays live data from the `/api/stats` endpoint:

- **Capital Deployed** -- Total invested across all client positions
- **Investor Clients** -- Count of users with the CLIENT role
- **Active Investments** -- Count of non-deleted investments

The forgot-password, reset-password, and advisor-accept pages share the same marketing layout.

### Logging In

1. Navigate to `/login` in your browser.
2. Enter the admin email and password (see [Default Credentials](#default-credentials) below).
3. If two-factor authentication is enabled on the account, a verification code will be sent to your phone via SMS.
4. After successful login, users are redirected based on their role: admins and super-admins go to `/admin`, advisors go to `/advisor/dashboard`, and clients go to `/dashboard`.

### Admin Layout

The admin panel features a navy sidebar (`#2C3E5C`) matching the client portal, and a dark navy header (`#1A2640`):

**Header:** "PARTNERS + CAPITAL" branding with an "Admin Portal" gold badge, plus links to Audit Log, Settings, and the admin avatar.

**Sidebar sections:** (navy background with white/gold text, same styling as client portal)

- **MANAGE:** Clients (with count), Investments (with count), Documents (with count), Advisors (with count), Activity Feed, Support (with open ticket count)
- **WEBSITE:** Pages (with count), Blog Posts (with count), Blog Categories, Media Library (with count), Footer
- **SYSTEM:** Admin Users, Audit Log, Settings

Hover states use gold-light text (`#E8D5B0`). Count badges use `bg-white/10 text-white/60`.

### Client Management (Admin Dashboard)

The admin landing page at `/admin` is the Client Management view. It provides:

- **3 summary cards:** Total Clients (with new this month), Active Portals (with pending setup count), AUM Total (with deal count)
- **Audit status bar:** Shows the latest audit log action with a green indicator
- **Search and filters:** Full-text search, status filter (All/Active/Inactive/Suspended), role filter (All/Client/Advisor)
- **Export CSV:** Download a CSV of the filtered client list
- **Tabs:** All Clients, Pending Setup, Active, Archived
- **Client table:** Displays name, email, company, total invested, current value, last login, status, and action buttons (View/Edit/Archive)
- **Account Status:** Each client has an explicit `accountStatus` field (Active, Pending, or Suspended) that admins can set via the Edit Client dialog. This replaces the old derived "Pending" status which was based on investment count. New clients default to Active.
- **Add Investment:** The client detail page (`/admin/clients/[id]`) includes an "Add Investment" button in the Investments tab. This opens a dialog to select an existing investment, enter the amount, and optionally set the investment date.
- **Client-Scoped Investment View:** Clicking an investment row from a client's detail page opens the investment detail page scoped to that client's position. The header shows the client's name with a back button to the client page, summary cards display only that client's invested amount and current value (not the fund totals), the Client Positions tab is hidden, and the Documents tab filters to show only that client's documents plus investment-level shared documents. Navigating to the same investment from the main Investments list shows the full fund view with all client positions aggregated.
  - **CRUD in the scoped view:** The header shows **Edit Position** (edit the position's invested amount, current value, APR, IRR, date — `PATCH /api/admin/investments/[id]/clients/[clientInvestmentId]`) and, for Super Admins, **Delete Position** (soft-deletes the position and returns to the client page). The **Distributions** tab has an **Add Distribution** button, and the **Contributions** tab is now full CRUD — **Add Contribution**, plus per-row edit and delete. Contribution APIs: `POST /api/admin/investments/[id]/clients/[clientInvestmentId]/contributions` (create), `PATCH /api/admin/contributions/[id]` (edit), `DELETE /api/admin/contributions/[id]` (soft delete). Contributions are bookkeeping records — the position's `amountInvested` remains the source of truth and is not auto-adjusted.
- **Welcome Email on Client Creation:** When an admin creates a new client, a welcome email is automatically sent to the client's email address. The email contains a "Set Your Password" link that directs the client to the password reset page. The link expires in 1 hour. If the link expires, the client can use the "Forgot your password?" flow on the login page as a fallback. No manual password entry is required by the admin -- a secure temporary password is generated automatically.
- **Client Detail Documents Tab:** The Documents tab on the client detail page (`/admin/clients/[id]`) displays a full document table with name, type, file size, upload date, and action buttons. Features include:
  - **Upload Document** button that opens the upload dialog pre-filled with the client
  - **Download** link for each document (uses the admin download route with security headers)
  - **Delete** button visible only to SUPER_ADMIN users, with confirmation prompt
  - Empty state prompts the admin to upload a document

### Admin Routes

| Route                  | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `/admin`               | Client Management dashboard with stats and table     |
| `/admin/pages`         | CMS page builder -- list, create, edit pages         |
| `/admin/pages/new`     | Create a new CMS page with block editor              |
| `/admin/pages/[id]/edit` | Edit an existing page with drag-and-drop blocks    |
| `/admin/blog`          | Blog post management -- list, create, edit posts     |
| `/admin/blog/new`      | Create a blog post with rich text editor             |
| `/admin/blog/[id]/edit` | Edit an existing blog post                          |
| `/admin/blog/categories` | Manage blog categories (CRUD)                      |
| `/admin/media`         | Media library -- upload, browse, edit, delete media  |
| `/admin/footer`        | Footer settings -- modules, logo, content, and colors |
| `/admin/investments`   | Manage investments, funds, and asset classes          |
| `/admin/distributions` | Centralized list of all distributions across investments |
| `/admin/documents`     | Upload and manage documents (K-1s, reports, PPMs)    |
| `/admin/activity`      | Manage activity feed posts and deal room updates     |
| `/admin/support`       | View and respond to client support tickets           |
| `/admin/audit-log`     | View audit trail of all system actions                |
| `/admin/api-keys`      | Create and manage API keys for external integrations |
| `/admin/settings`      | Organization settings (branding with media picker, typography, colors, 2FA policy) |
| `/admin/access-requests` | Review and manage access requests from prospective clients |
| `/admin/clients/[id]`  | Client detail with "View as Client" impersonation    |

- **Admin Documents Page (`/admin/documents`):** Features include:
  - **Checkbox Selection:** Select-all checkbox in the table header and per-row checkboxes. Selected rows are highlighted with a champagne tint (`bg-[#FDF5E8]/50`).
  - **Bulk Delete:** When one or more rows are selected and the user is SUPER_ADMIN, a "Delete Selected (N)" destructive button appears above the table. Clicking it opens a confirmation dialog before soft-deleting the selected documents via `DELETE /api/admin/documents`.
  - **Show Deleted Toggle:** A switch next to the filter controls toggles inclusion of soft-deleted documents. Deleted rows render at 50% opacity.

### Admin Roles

The system supports multiple admin access levels:

- **SUPER_ADMIN** -- Full system access. Can manage all settings, users, and data.
- **ADMIN** -- Administrative access with sub-roles:
  - **FULL_ACCESS** -- Same as SUPER_ADMIN but cannot modify system-level settings.
  - **READ_ONLY** -- Can view all admin panels but cannot create, edit, or delete data.
  - **DATA_ENTRY** -- Can create and edit investments, contributions, and distributions but cannot manage users or settings.

---

## Public Website

The public-facing marketing site replaces the previous Squarespace website. It runs on the same Next.js application as the investor portal.

### Marketing Layout

All public pages share a common layout with:

- **Header:** Sticky dark navy bar with "PARTNERS + CAPITAL" logo (bordered, links to admin dashboard for admins, client dashboard for clients, or home for visitors), database-driven navigation links (configured via page settings), and a gold-outlined "Investor Login" button with LogIn icon. On the homepage, the header starts transparent and transitions to solid on scroll. Navigation links are pulled from CMS pages that have "Show in navigation" enabled, sorted by nav order. Fallback nav shows only "Home" when no pages have navigation enabled. On mobile, the header stacks vertically with the logo centered on top and the hamburger menu button centered directly below it; on desktop it lays out as a single row (logo left, nav center, login right).
- **Footer:** Dark navy background with 3-column grid (branding + address, database-driven navigation links + Investor Login, newsletter signup form), copyright line, and legal disclaimer.

### Public Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage -- rendered from CMS page builder (isHomepage flag) |
| `/blog` | Blog listing -- 3-column grid, 9 posts per page, category/tag filters |
| `/blog/[slug]` | Individual blog post with hero image, prose content, related posts |
| `/contact` | Contact page -- rendered from CMS page builder |
| `/privacy-policy` | Privacy Policy -- TCPA/carrier-compliant privacy disclosures including SMS program terms |
| `/terms-of-use` | Terms of Use -- service terms including SMS program consent language and carrier disclaimers |
| `/[slug]` | Dynamic CMS pages -- any published page by slug |

### Homepage

The root route (`/`) renders the CMS page marked as homepage. If no homepage exists, authenticated users are redirected to their portal (admin, advisor, or client dashboard) and unauthenticated users are redirected to `/login`. Authenticated users see a floating "Go to Portal" button in the bottom-right corner.

---

## Blog System

### Overview

The blog (called "Partner Thoughts" publicly) provides article publishing with categories, tags, rich text editing, and SEO metadata.

### Admin Blog Management

**Post List** (`/admin/blog`): Search, filter by status (published/draft) and category, paginated table with title, category, status, view count, published date, and view (opens in new tab)/edit/delete actions. Posts are sorted by publish date, newest first. Supports bulk delete via the DELETE endpoint (soft-deletes all specified posts). The GET endpoint accepts an `includeDeleted=true` query parameter to include soft-deleted posts in results.

**Create/Edit Post** (`/admin/blog/new`, `/admin/blog/[id]/edit`): Two-column editor with:
- **Main area:** Title (auto-generates slug), excerpt, Tiptap rich text editor with full toolbar (bold, italic, underline, strikethrough, headings, lists, alignment, colors, links, images via media picker, blockquotes, code blocks, tables, undo/redo, HTML source toggle)
- **Sidebar:** Publish settings (draft/publish toggle), category checkboxes (multi-select), tag checkboxes, hero image (via media picker), SEO fields (meta title, meta description)

### Multiple Categories per Post

Blog posts support multiple categories. The category selector uses checkboxes (the same pattern as tags) instead of a single-select dropdown:

- **Create post:** Check one or more categories from the Categories card in the sidebar.
- **Edit post:** Previously assigned categories are pre-checked. Add or remove categories by toggling the checkboxes.
- **Public display:** Posts show all assigned category badges on blog cards and listing pages.
- **Filtering:** Category filter on the public blog page shows posts that belong to the selected category (posts can appear under multiple category filters).
- **Migration:** Existing posts with a single category were automatically migrated to the new multi-category system.

**Categories** (`/admin/blog/categories`): CRUD management with name, slug, color, and sort order.

### Public Blog

**Listing** (`/blog`): Navy hero banner, category filter pills, 3-column responsive post grid with cards showing hero image, category badge, title, excerpt, date, and read time. Tag filter section at bottom. Server-side pagination (9 posts per page).

Posts are sorted strictly by publish date, defaulting to newest first. A **Sort** dropdown next to the category pills lets visitors switch between "Newest first" and "Oldest first" (persisted via a `sort=oldest` query param). Pagination shows clickable numbered page links -- up to 3 pages in either direction of the current page -- alongside Previous/Next buttons. All active filters (category, tag, search) and the chosen sort order are preserved across page and filter navigation.

**Post Detail** (`/blog/[slug]`): Hero image or navy fallback, breadcrumb navigation, author/date/read-time/view-count metadata, full prose content, tags, share button (clipboard + native share API), up to 3 related posts. Full SEO metadata via `generateMetadata()`.

### Blog API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/blog` | GET, POST, DELETE | Admin |
| `/api/admin/blog/[id]` | GET, PATCH, DELETE | Admin |
| `/api/admin/blog/categories` | GET, POST | Admin |
| `/api/admin/blog/categories/[id]` | PATCH, DELETE | Admin |
| `/api/admin/blog/tags` | GET, POST | Admin |
| `/api/admin/blog/tags/[id]` | PATCH, DELETE | Admin |
| `/api/blog` | GET | Public |
| `/api/blog/[slug]` | GET | Public |
| `/api/blog/recent` | GET | Public |

---

## Page Builder

### Overview

The page builder allows admins to create and edit CMS pages using drag-and-drop content blocks. Pages are rendered on the public site at their slug URL.

### Block Types

| Type | Description |
|------|-------------|
| Hero (Video) | Full-viewport video background with left-aligned content, staggered fadeUp animations, tagline, `*italic*` gold heading support, dual CTAs, dynamic stats from database, gold divider, and scroll hint |
| Hero (Image) | Image background with overlay text, CTA, optional tagline, text alignment (left/center/right), decorative grid pattern overlay, and bottom gold gradient divider |
| Text Section | Rich HTML content with configurable width, padding, colors |
| Logo Gallery | Grid of logos/images with optional grayscale effect and drag-and-drop reordering |
| Stats | Number cards row (values + labels) on dark background |
| CTA Banner | Full-width call-to-action with heading, text, and button |
| Two Column | Side-by-side layout with nested content blocks in each column (or legacy rich text). Supports all block types except heroes and nested two-column. |
| Contact Form | Name/email/message form posting to `/api/contact` |
| Newsletter Signup | Email signup form posting to `/api/newsletter` |
| Quote | Blockquote with attribution and role |
| Image | Single image with alt text and caption |
| Video Embed | YouTube/Vimeo responsive iframe |
| Spacer | Vertical spacing (sm/md/lg/xl) |
| Asset Cards | 4-column grid of asset class cards with numbered layout, gold accents, and navy hover effect. Each card in the block editor has a **Modal Content** WYSIWYG field; when set, the card becomes clickable on the front end and opens a popup (Dialog) rendering that rich content. Cards with empty Modal Content stay non-clickable. |
| Philosophy | Navy section with large italic serif quote (supports `*italic*` gold text) and pillars sidebar with gold left border |
| Process Steps | Roman-numeral numbered steps with a sticky navy sidebar card showing stats and quote; optional dynamic stats from database |
| CTA Split | Two-column CTA layout with heading, description, dual buttons on left and bullet list with gold dots on right |
| FAQ | Sectioned FAQ accordion with roman-numeral section headers, sticky sidebar navigation with scroll tracking, serif question text, HTML-rich answers with styled lists and callout notes, and single-open accordion behavior. Supports legacy flat `items` format for backward compatibility |

### Admin Page Editor

**Page List** (`/admin/pages`): Table showing checkbox, drag handle, title, slug, status (Draft/Published/Archived), homepage indicator, nav indicator, nav order, blog indicator, block count, last updated, and view (opens in new tab)/edit/delete actions. Pages are sorted by nav order ascending. Drag and drop rows to reorder pages -- the new order is saved automatically and reflected in the public site navigation. Features:

- **Checkbox selection:** Select-all checkbox in the header and per-row checkboxes. Selected rows are highlighted with a gold tint background. A "Delete Selected (N)" destructive button appears when rows are selected, with a confirmation dialog before bulk soft-deleting.
- **Show Deleted toggle:** A switch next to the search bar that includes soft-deleted pages in the list. Deleted pages appear with reduced opacity (50%).

**Create/Edit Page** (`/admin/pages/new`, `/admin/pages/[id]/edit`): Two-column layout with:
- **Main area:** Title, slug, and block editor with drag-and-drop reordering (@dnd-kit). Add blocks via a picker dialog showing all 18 block types. Each block expands/collapses to show its editor form.
- **Sidebar:** Status dropdown, homepage checkbox, blog page checkbox, navigation settings, hero image (via media picker), SEO fields, save button.
- **Two Column nested blocks:** When editing a Two Column block, each column has its own "Add Block" button and mini block editor. Sub-blocks are stored as arrays (`leftBlocks`/`rightBlocks`) in the block's JSON props. Existing Two Column blocks using `leftContent`/`rightContent` HTML continue to render correctly.

Pages are saved atomically: page metadata and all blocks are updated in a single database transaction.

### Block Font Controls (Family, Weight, Size)

Every text element with a color picker also has a **FontField** control with three settings:

- **Font Family** -- Dropdown to choose from the available font presets (Hero Title, Section Heading, Tag, Subtitle, Body) or keep the default
- **Font Weight/Style** -- Dropdown for weight and style combinations (Light, Regular, Medium, Semi-Bold, Bold, plus italic variants)
- **Font Size** -- Free-text input accepting any CSS size value (e.g., `16px`, `24px`, `clamp(16px, 2vw, 32px)`)

Each FontField displays a small gray hint showing the default size for that element, so admins can maintain consistency when overriding. For example, heading fields show "Default: 48px (h1)" or "Default: 36px (h2)", body text shows "Default: 13px", buttons show "Default: 11px", etc.

Font overrides are stored as a compound string in the format `"family|style|size"` (e.g., `"heroTitle|bold|32px"` or `"||24px"` for size-only). Existing blocks without a font size set render unchanged -- the format is fully backward-compatible.

Block-level font overrides (family, weight, style, size) are applied as inline styles on the rendered elements. For heading elements (h1--h6), the marketing typography CSS rules intentionally omit `!important` so that per-block inline overrides take precedence over the global CSS variable defaults. Non-heading elements (body text, buttons, bullets) never had `!important` on font-size and work with inline overrides by default.

### Rich Text Editor Font Size

The Tiptap rich text editor toolbar includes a **Font Size** dropdown (next to the Font Family dropdown) for inline font size formatting. Available sizes: 10px through 72px. Selecting "Default" removes the inline font-size override. Font sizes are applied as inline `font-size` styles on the selected text via the TipTap `textStyle` mark.

### Navigation Visibility

Admins can control which CMS pages appear in the public header and footer navigation:

- **Show in navigation** -- Checkbox that adds the page to the header and footer nav bars. Only published pages with this enabled appear in nav.
- **Nav label** -- Optional override for the display text in nav (defaults to the page title). Only visible when "Show in navigation" is checked.
- **Nav order** -- Numeric sort order (lower numbers appear first). Only visible when "Show in navigation" is checked.

The pages list table shows a navigation icon (blue) for pages that appear in nav.

When no pages have "Show in navigation" enabled, the header and footer fall back to showing only a "Home" link.

### Blog Page Designation

One CMS page can be designated as the "blog page," similar to how one page can be the homepage:

- **Set as blog page** -- Checkbox in the page settings sidebar. Only one page can be the blog page at a time; toggling it on automatically unsets any previous blog page.
- When a visitor navigates to a blog page's URL, the blog listing (with post grid, category/tag filters, and pagination) is rendered instead of the page's content blocks.
- The pages list table shows a book icon (green) for the blog page.

This allows admins to place the blog at any URL (e.g., `/insights`, `/partner-thoughts`, `/news`) rather than being hardcoded to `/blog`. The existing `/blog` route continues to work as a fallback.

### Page Hero

Every non-homepage page displays a hero banner at the top of the page. The hero supports rich content fields configured per-page in the admin sidebar.

#### Layout

- **Background:** Navy (`#1A2640`) solid background, or a full-bleed background image with dark overlay.
- **Content:** Left-aligned within a max-width container (max-w-7xl).
- **Homepage:** No hero is rendered; the page content blocks render directly.

#### Hero Content Fields

Configured in the admin sidebar under the "Hero Content" card:

| Field | Description |
|-------|-------------|
| **Tagline** | Uppercase label above the heading with a gold dash (e.g., "FREQUENTLY ASKED QUESTIONS"). Uses section tag typography settings. |
| **Title** | The page title rendered as an h1. Supports HTML — use `<em>` tags for gold italic accent text (e.g., `Everything you want to know.<em> No fluff.</em>`). Uses hero title typography settings. |
| **Subtitle** | Gold italic text at the same large size as the heading (e.g., "No fluff."). Supports HTML. Uses subtitle typography settings. |
| **Description** | Smaller italic serif text below the heading (e.g., "Straight answers about who we are..."). Supports HTML. Muted gold color (`rgba(232,213,176,0.65)`). |
| **Show Grid Pattern** | Checkbox to overlay a subtle grid pattern on the background. |
| **Show Bottom Divider** | Checkbox to show a gold gradient divider line at the bottom of the hero. |

#### Hero Image

To set a hero background image:
1. Edit a page in the admin panel.
2. In the sidebar, find the "Hero Image" card.
3. Click "Choose image" to open the media picker and select an image.
4. The image preview appears with an X button to clear it.

Blog posts also use the same shared `PageHero` component with title and image only.

The hero background uses a fixed (parallax) attachment on desktop only (`md:bg-fixed`). On mobile it falls back to normal scroll attachment, because iOS Safari renders `background-attachment: fixed` upscaled and blurry.

### Page API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/pages` | GET, POST, DELETE | Admin |
| `/api/admin/pages/[id]` | GET, PATCH, DELETE | Admin |
| `/api/admin/pages/reorder` | PATCH | Admin |

**GET `/api/admin/pages`** supports an `includeDeleted=true` query parameter. When set, the `deletedAt: null` filter is removed so soft-deleted pages are returned alongside active ones. Each page object includes its `deletedAt` timestamp.

**DELETE `/api/admin/pages`** accepts `{ ids: string[] }` in the request body. It soft-deletes all matching pages (sets `deletedAt` to the current timestamp) and returns `{ deleted: number }`. An audit log entry with action `BULK_DELETE_PAGES` is created.

---

## Media Library

### Overview

The media library manages public images, videos, and PDF documents used across blog posts and CMS pages. Files are stored unencrypted in `public/uploads/media/YYYY/` and served directly by Next.js.

### Admin Media Browser (`/admin/media`)

- **Upload:** Drag-and-drop or file picker. Images up to 10MB, videos up to 100MB, PDFs up to 50MB.
- **Browse:** Grid of thumbnails with search and type filter (Images/Videos/All). Paginated.
- **Checkbox selection:** Each grid item has a checkbox in the top-left corner. Selected items show a gold ring highlight. Clicking the checkbox does not open the detail view.
- **Bulk delete:** When one or more items are selected, a "Delete Selected (N)" button appears in the header. Clicking it opens a confirmation dialog, then soft-deletes all selected items via `DELETE /api/admin/media` with `{ ids: [...] }`.
- **Show Deleted toggle:** A switch next to the type filter controls whether soft-deleted items appear in results. When enabled, deleted items render with reduced opacity (50%). The toggle resets page and clears selection.
- **Rename:** Hover over any media item in the picker to see a pencil icon. Click it to rename the file. The file is renamed on disk with an SEO-friendly slug and the database path is updated.
- **Edit:** Click any media item to update alt text and caption. The detail modal also shows a read-only **File URL** field (the full absolute URL to the file) with a **copy button** (shows a check for 2s after copying).
- **Delete:** Soft delete (sets deletedAt, removes file from disk).
- **Supported formats:** JPEG, PNG, GIF, WebP, SVG (images); MP4, WebM, MOV (videos); PDF (documents). SVG files are explicitly accepted in all file pickers for full browser compatibility. PDFs render a "PDF" file-icon tile in the grid (no `<img>`) and an embedded preview (with an "Open PDF" fallback link) in the detail view. Image-only pickers (logo, favicon, OG image, hero image) filter to `image/*` server-side, so PDFs only appear in the general media browser and the "all"-mode picker.

### Filenames and SEO

Uploaded files are stored with SEO-friendly filenames derived from the original file name (e.g., `my-company-logo-a3f28bc1.jpg`), rather than random UUIDs. A short hash suffix prevents collisions. Files can be renamed after upload via the media picker's rename feature.

### Media Picker Component

A reusable dialog component (`MediaPicker`) that can be opened from any admin form. Provides browse and upload tabs, returns the selected media object. Supports both click-to-upload and drag-and-drop file upload. Used in the blog post editor, page block editor, and anywhere images/videos are needed.

### Media API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/media` | GET, POST, DELETE | Admin |
| `/api/admin/media/[id]` | GET, PATCH, DELETE | Admin |

**GET `/api/admin/media`** supports an `includeDeleted=true` query parameter. When set, soft-deleted media items are included in the results (the `deletedAt` timestamp is returned for each item). By default, deleted items are excluded.

**DELETE `/api/admin/media`** accepts `{ ids: string[] }` in the request body and soft-deletes all matching media items (sets `deletedAt`). Returns `{ deleted: number }` with the count of items deleted. Logged as `BULK_DELETE_MEDIA` in the audit trail.

### Contact Form & Newsletter

| Route | Methods | Auth | Rate Limit |
|-------|---------|------|------------|
| `/api/contact` | POST | Public | 5/hour per IP |
| `/api/newsletter` | POST | Public | 10/hour per IP |

Contact submissions are stored in the `ContactSubmission` table and trigger an email notification to the organization email. Newsletter subscriptions use upsert logic -- re-subscribing a previously unsubscribed email reactivates it.

---

## Client Portal Guide

### Portal Layout

The client portal features a light gray background (`#f5f5f3`) with a navy sidebar (`#2C3E5C`) and dark navy header (`#1A2640`):

**Header:** "PARTNERS + CAPITAL" in uppercase with a gold "Client Portal" badge, plus links to Documents, Advisor Access, Notifications (bell icon), and the user avatar.

**Sidebar sections:** (navy background with white/gold text)

- **INVESTOR:** Dashboard, Portfolio, Documents, Distributions, Advisor Access
- **ACCOUNT:** Settings, Support, Log Out

Active navigation items are highlighted with gold-light text (`#E8D5B0`) on hover.

### Dashboard

The dashboard at `/dashboard` has two states:

**Full State (active investor):**
- Welcome message with last updated timestamp
- **4 KPI cards:** Total Invested (with investment count), Current Value (with gain amount), Total Return (with Net IRR), Cash Distributed (YTD)
- **Allocation section:** Horizontal bars showing portfolio allocation by asset class with color coding (Oil & Gas = amber, Real Estate = navy, Private Credit = dark gray, Specialty = light gray)
- **Portfolio Growth chart:** Line chart showing value over time with an amber/gold line
- **Active Investments table:** Deal name, invested amount (compact format like $250K), return percentage, status badge
- **Documents section:** Recent documents with title, type, investment name, and Download link
- **Recent Activity section:** Timeline with amber bullet dots, event descriptions, and dates

**Empty State (new investor, no investments):**
- Navy hero banner with welcome message, user initials avatar, and "Contact your advisor" link
- **3 Getting Started cards:**
  1. Portal access -- green checkmark, "Your account is active and secure"
  2. First investment confirmed -- "Once your subscription is processed, your dashboard will populate"
  3. Invite your advisor -- "Give your CPA or financial advisor read-only access"
- Two dashed-border placeholder cards for Portfolio and Documents

### Portfolio / Investments

The portfolio page at `/investments` lists all active investment positions. Clicking an investment opens the detail page.

### Investment Detail

The investment detail page at `/investments/[id]` features:

- **Navy header section:** Breadcrumb navigation, investment name, asset class and location, status badge
- **Tab navigation:** Overview, Updates, Documents, Disclosures
- **5 KPI cards:** Invested (with date), Current Value (with gain), Total Return (with Net IRR), Cash Distributed (with payment count), Holding Period (with target)
- **Two-column Overview layout:**
  - Left: Description paragraph and metadata table (asset class, location, investment date, target hold, target return, distribution cadence, fund status)
  - Right: Value Over Time line chart and Latest Update card
- **Updates section:** Grouped by month/year with title and description
- **Documents section:** List with title, type, date, and download link
- **Disclaimer box:** Standard private investment risk disclosure

### Documents

The documents page at `/documents` includes:

- **CPA access banner:** If an advisor has tax/document access, shows their name, permission level, and expiration date with a "Manage access" link
- **Left sidebar:**
  - CATEGORIES: All Documents, Tax Documents, Quarterly Reports, Legal & Agreements, Capital Notices (with counts)
  - BY INVESTMENT: Each investment name with document count
- **Document cards:** File type badge (PDF = red, DOC = blue), title, upload date, file size, "Visible to CPA" indicator, type tags, "New" badge for recently uploaded documents, Download button
- **Filters:** Year, type, and investment dropdowns

The Documents page has two tabs:

**All Documents tab** -- The default view described above with the sidebar, filters, and full document list.

**Tax Center tab** -- A purpose-built view for tax season that organizes K-1s and 1099s by year and investment:

- **Tax season reminder banner:** Navy card reminding that K-1 forms are typically available by March 15. Includes a link to the Advisor Access page for granting CPA access.
- **Summary line:** Shows the count of tax documents, number of investments, and selected year. Includes a "Download All" button.
- **Year selector:** Horizontal pill buttons for each year that has tax documents. The most recent year is selected by default.
- **Investment cards:** 2-column grid where each card groups tax documents by investment. Each row shows the document type, file size, a "New" badge (if uploaded in the last 30 days) or "Available" badge, and a download button.
- **Download All:** Downloads all tax documents for the selected year sequentially.
- **Previous Years:** Collapsible section below the investment cards showing older years in a compact list format.
- **Empty state:** If no tax documents exist, shows a message about K-1 availability timeline.

The Tax Center tab badge on the tab trigger shows the total count of tax documents.

### Distributions

The distributions page at `/capital-activity` shows contribution and distribution history for each investment position.

### Settings

The settings page at `/settings` allows users to update their profile information, profile photo, and manage two-factor authentication.

#### Profile Avatar

Clients can upload a profile photo that replaces the default initials avatar in the portal header and settings page:

- **Upload:** Click "Upload Photo" in the Profile section. Supported formats: JPEG, PNG, WebP, GIF (max 2MB).
- **Preview:** The uploaded image displays as a circular avatar in the settings page and in the portal header.
- **Remove:** Click "Remove" next to the upload button to revert to the default initials avatar.
- **Persistence:** The avatar is stored on the server and persists across sessions.
- **Impersonation:** When an admin views as a client, the client's avatar (or initials) is displayed in the header.

---

## Support Ticket System

### Client Support (Portal)

Clients can submit and track support tickets at `/support`:

- **New Ticket form:** Subject, Category (Account, Documents, Investments, Technical, Other), and Message fields
- **Your Tickets list:** Shows all submitted tickets with status badges (Open, In Progress, Resolved, Closed), creation date, category, and reply count
- **Ticket Detail dialog:** Click any ticket to view the full conversation thread with replies from staff (highlighted in blue) and the ability to reply (unless the ticket is Closed)

### Admin Support Management

Admins manage all support tickets at `/admin/support`:

- **Filters:** Filter by status (Open, In Progress, Resolved, Closed) and priority (High, Medium, Low)
- **Ticket list:** Shows all tickets with client name, status badge, priority badge, category, and reply count
- **Ticket Detail dialog:** View the full thread, change the ticket status, and post admin replies (shown with a "Staff" badge)

---

## Advisor Access

### Overview

Investors can share read-only portfolio access with their CPAs, financial advisors, or family office representatives. The advisor access page is at `/advisors`.

### Inviting an Advisor

The invite form collects:
- **Advisor name** and **email address**
- **Advisor type:** CPA / Tax Advisor, Financial Advisor, Family Office, Attorney, Other
- **Access level** (10 tiers):
  1. **Dashboard only** -- Portfolio summary, allocation, and performance numbers. No documents.
  2. **Dashboard + Tax documents** -- Includes K-1s and 1099s. Best for CPAs.
  3. **Dashboard + Legal documents** -- Includes Subscription Agreements and PPMs. Best for attorneys.
  4. **Dashboard + Reports** -- Includes Quarterly Reports and Annual Reports. No tax or legal docs.
  5. **Dashboard + Tax + Legal** -- K-1s, 1099s, Subscription Agreements, and PPMs. No reports.
  6. **Dashboard + Tax + Reports** -- K-1s, 1099s, Quarterly Reports, and Annual Reports. No legal docs.
  7. **Dashboard + All documents** -- Full document vault access. Recommended for financial advisors and family offices.
  8. **Dashboard + Capital Activity** -- Portfolio summary plus contributions and distributions. No documents.
  9. **Dashboard + Capital Activity + All documents** -- Full document vault plus capital activity history.
  10. **Full access** -- Everything: all documents, capital activity, and investment details.
- **Access start date** (defaults to today)
- **Expiration date** (when access automatically expires)

The `investmentId` field on AdvisorAccess can scope any permission level to a single investment.

Upon submission, the advisor receives a secure email invitation.

### Managing Active Advisors

Each active advisor card displays:
- Name, type, firm, email, and initials avatar
- Status badge: "Active" (green) or "Invite pending" (amber)
- **Access tags:** Descriptive pills showing what the advisor can see (Dashboard, K-1s, 1099s, Reports, Legal docs, All documents)
- Expiration date and last viewed date
- Action buttons: Edit and Revoke (for active), Resend and Cancel (for pending invitations)

### Access Log

Below the active advisors, an access log shows advisor-related activity with timestamps and event descriptions.

---

## Two-Factor Authentication (2FA)

Partners + Capital supports SMS-based two-factor authentication. When enabled, a 6-digit verification code is sent to the user's phone via text message on each login.

### Organization 2FA Policy

The organization-level 2FA policy (configured in `/admin/settings`) controls how 2FA is enforced across the platform:

- **Optional** (default) -- Clients/advisors can choose whether to enable SMS two-factor authentication on their account.
- **Mandatory** -- All users must set up SMS two-factor authentication. Users who have not configured 2FA are redirected to the forced-enrollment page (`/setup-2fa`) after login. They cannot access the portal or admin panel until 2FA is set up. Users with 2FA already enabled cannot disable it.
- **Disabled** -- Two-factor authentication is turned off for **non-admin** users. The 2FA section is hidden from their settings page, and their login skips 2FA checks.

> **Admins always require 2FA.** Regardless of the org policy above — including "Disabled" — every user with the `ADMIN` or `SUPER_ADMIN` role must enroll in and use two-factor authentication. An admin without 2FA is forced through `/setup-2fa` on their next login; an enrolled admin is always SMS-challenged. This is enforced in `authorize()` (`src/lib/auth.ts`) and cannot be turned off from the settings UI.

### Server-Side Enforcement (no client-only gates)

2FA is enforced on the **server**, not just in the login UI:

- A credentials login that passes the password check but has **not** completed its required SMS code still produces a (partial) session so the login screen can show the 2FA step. Such a session is rejected by every protected layout and by the `requireAuth()` API guard (`twoFactorPending()` in `src/lib/auth.ts`) — it cannot be used to view any page or call any protected API by navigating directly to a URL.
- A user flagged for forced enrollment (`requiresTwoFactorSetup`) is redirected to `/setup-2fa` by every protected layout, and is blocked from all role-scoped APIs (`requireAdmin`/`requireClient`/`requireAdvisor`) except the 2FA setup endpoints themselves until enrollment completes.

### Forced Enrollment Page (`/setup-2fa`)

When a user must enroll (any admin, or any user under a mandatory policy), login sends them to `/setup-2fa`. This page lives in the public `(auth)` route group with its own session guard, so the redirect from the role-gated layouts never loops. After completing setup the user is signed out and returned to `/login` (with a confirmation notice) to sign in again with their newly enabled second factor.

### Admin 2FA Management (`/admin/settings` → Security)

Admins manage their own two-factor authentication in the **Security** section of `/admin/settings`, alongside the org-wide policy selector:

- **Regenerate backup codes** — issues a fresh set of 10 one-time codes (invalidating the old set) after SMS re-verification.
- **Disable** — intentionally unavailable. The button is replaced with "Required by organization", and the disable endpoint (`/api/portal/settings/two-factor/disable`) rejects any admin request with `403` regardless of how it is called, since 2FA is mandatory for admins.

The management UI reuses the same `TwoFactorManage` / `TwoFactorSetup` components and `/api/portal/settings/*` endpoints as the client portal (all `requireAuth`, so they work for any role). The admin's enrollment state is read from `GET /api/portal/settings` (`twoFactorEnabled`).

### Setting Up 2FA (User Flow)

1. Navigate to `/settings` (or `/admin/settings` for admins).
2. Find the "Two-Factor Authentication" section.
3. Click "Set up two-factor authentication."
4. Enter your phone number (with country code, e.g., +1 for US/Canada). The on-screen copy tells you a code will be texted to confirm the number and that it expires in 10 minutes.
5. A 6-digit verification code is texted to that number to **confirm it belongs to you**. Enter it to verify. The verify screen shows the number the code went to and offers **Resend code** and **Edit phone number** (so a mistyped or wrong number can be corrected without restarting).
6. Save your backup codes in a safe place (10 one-time codes for emergency access).
7. 2FA is now active on your account. A code will be sent to your phone on each login.

This identical flow (verify-the-number → expiring code → resend/edit) is used for **both client and admin** onboarding — they share the same `TwoFactorSetup` component.

### Login with 2FA

1. Enter email and password as normal.
2. A verification code is automatically sent to your phone via SMS.
3. Enter the 6-digit code to complete login. The screen notes the code expires in 10 minutes; you can resend it.
4. Alternatively, use a backup code if you cannot access your phone.

### Disabling 2FA

1. Navigate to `/settings` and click "Disable 2FA." (Admins cannot disable 2FA — it is mandatory for them.)
2. A verification code will be sent to your phone for confirmation.
3. Enter the code to disable 2FA.

### SMS Code Expiration

All SMS verification codes — login challenge, setup confirmation, and disable confirmation — are **single-use** and expire after a single consistent window, **`SMS_CODE_EXPIRY_MINUTES` (10 minutes)**, defined in `src/lib/two-factor-config.ts`. The expiry and a "never share this code" safety note are included in the SMS body and surfaced in the on-screen messaging. Submitting an expired code returns a distinct "That code has expired. Request a new code to continue." message (vs. a plain invalid-code message), prompting the user to resend.

### Technical Details

- A 6-digit SMS code is generated with `crypto.randomInt`, **hashed with bcrypt**, and stored on the user's `TwoFactorSecret` row (`smsCodeHash` + `smsCodeExpiresAt`). It is verified against the hash, checked for expiry, and **cleared on first successful use** (single-use). Helpers: `issueSmsCode` / `verifySmsCode` in `src/lib/two-factor.ts`.
- The `secret` column on `TwoFactorSecret` remains (legacy TOTP secret), but live login/setup/disable verification now uses the stored SMS code, not a rolling TOTP window. This gives an exact, consistent expiration instead of the previous ~30–90 second TOTP validity.
- The `twoFactorEnabled` flag on the User model tracks whether 2FA is active.
- SMS is sent via Twilio. When `TWILIO_ACCOUNT_SID` is not set, codes (with the expiry/safety message) are logged to the console (development/stub mode).
- Backup codes are hashed with bcrypt and stored in the `BackupCode` table.

---

## Session Security & Idle Timeout

All authenticated users (clients, advisors, and admins) are automatically signed out after **15 minutes of inactivity**. This is enforced with two complementary layers:

- **Client-side idle watcher** — `<IdleTimeout>` (`src/components/idle-timeout.tsx`) is mounted in every authenticated layout (admin, client portal, advisor, and verification). It tracks mouse, keyboard, scroll, and touch activity and, after 15 idle minutes, clears the session (`signOut({ redirect: false })`) and **hard-redirects** to `/login?timeout=1`. Notes:
  - The last-activity time is kept **in memory** (the reliable source of truth, so the timer works even when `localStorage` is blocked, e.g. private mode); `localStorage` is used only to sync activity across tabs, so working in one tab keeps the others alive and the whole session lapses together. (A previous version trusted `localStorage` alone and "failed open" — never timing out — when storage was unavailable.)
  - The redirect uses `window.location` rather than relying on `signOut`'s own redirect (which targets `pages.signOut`).
  - A **session-status safety net**: if the NextAuth session ever reports `unauthenticated` (e.g. the server token expired while the tab was closed/asleep), the watcher bounces to login immediately.
  - It checks every 15s and re-checks on tab focus/visibility.
- **Server-side rolling session** — the NextAuth JWT uses `maxAge: 15 min` with `updateAge: 5 min` (`src/lib/auth.ts`). The global `SessionProvider` re-fetches every 5 minutes (and on window focus), which rotates the token while a tab is active, so engaged users stay signed in. A token that stops being refreshed (tab closed, device asleep, or a stolen cookie used out-of-band) expires within ~15 minutes — replacing the previous 30-day default and bounding session-token exposure. The client watcher above is what produces the visible "logged out" redirect for an idle but still-open tab.

When a user is bounced to the login page after a timeout, the notice "You have been automatically logged out due to inactivity. Please sign in again." is shown. The idle window is defined by the `DEFAULT_TIMEOUT_MS` constant in `idle-timeout.tsx` and `session.maxAge` in `auth.ts`.

---

## Timestamps and Timezone

All dates and times displayed throughout the application use the **America/New_York (Eastern Time)** timezone. Timestamps include an "ET" suffix for clarity.

### Date Formatting Functions

All date formatting is centralized in `src/lib/utils.ts`:

| Function | Output | Usage |
|----------|--------|-------|
| `formatDate()` | "Jan 15, 2025, 2:30 PM ET" | Default for all event timestamps (created, updated, last login, replies) |
| `formatDateOnly()` | "Jan 15, 2025" | Investment dates, expiration dates, start/end dates |
| `formatDateTime()` | "Jan 15, 2025, 2:30:45 PM ET" | Audit logs (second-level precision) |
| `formatMonthYear()` | "January 2025" | Update grouping headers, activity timeline |
| `formatShortDate()` | "Jan '25" | Chart axis labels |
| `formatTimeAgo()` | "5m ago" / "3d ago" | Notifications, audit status bar |
| `formatDateLong()` | "January 15, 2025, 2:30 PM ET" | 2FA backup code exports |

When adding new features, always use these centralized formatters rather than inline `Intl.DateTimeFormat` or `toLocaleDateString()` calls. This ensures consistent timezone handling across the application.

### Date Picker Component

The application uses a custom-branded `DatePicker` component (`src/components/ui/date-picker.tsx`) built on react-day-picker v9. It replaces all native browser date inputs with a popover calendar styled to match the site's design system:

- Calendar icon trigger with long-form date display ("January 15, 2025")
- Gold accent ring on today's date
- Navy background on selected date
- Warm cream hover states
- Optional clear button for nullable date fields

Usage:
```tsx
import { DatePicker } from "@/components/ui/date-picker";

<DatePicker
  value={dateValue}          // YYYY-MM-DD string
  onChange={setDateValue}     // receives YYYY-MM-DD string
  placeholder="Select date"
  clearable                  // shows X button to clear (for optional fields)
/>
```

---

## Default Credentials

After running the seed script, the following accounts are available in development:

| Account          | Email                          | Password     | Role        |
| ---------------- | ------------------------------ | ------------ | ----------- |
| Admin            | `admin@partnersandcapital.com` | `admin123!`  | SUPER_ADMIN |
| Client (full)    | `david.morgan@example.com`     | `client123!` | CLIENT      |
| Client           | `sandra.okafor@example.com`    | `client123!` | CLIENT      |
| Client (empty)   | `james.whitfield@example.com`  | `client123!` | CLIENT      |
| Client           | `rachel.tran@example.com`      | `client123!` | CLIENT      |

- **David Morgan** -- Has 3 active investments with positions, documents, and activity. Shows the full dashboard state.
- **James Whitfield** -- Has no investments. Shows the empty/onboarding dashboard state.

**Important**: Change all passwords immediately after your first login. These are default credentials intended for development and initial setup only.

---

## Deployment Basics

### Environments

The project supports two deployment environments:

- **Staging** -- For testing before production. Runs on port 3001.
- **Production** -- Live environment. Runs on port 3000.

### Environment Files

Each environment requires its own env file:

- `.env.staging` -- Staging server configuration
- `.env.production` -- Production server configuration

These files contain both application variables (DATABASE_URL, NEXTAUTH_SECRET, etc.) and deployment variables (SERVER_USER, SERVER_HOST, SSH_KEY, etc.).

### Deploying

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (requires main/master branch, clean working directory)
./scripts/deploy.sh production
```

The deploy script performs the full pipeline automatically:

1. Validates the environment and checks SSH connectivity
2. Runs linting and Prisma schema validation
3. Builds the Next.js application
4. Backs up the database on the server (mysqldump)
5. Transfers files via rsync to a new timestamped release directory
6. Symlinks the new release as `current`
7. Installs production dependencies
8. Runs database migrations
9. Runs the idempotent seed (creates organization and admin user if missing)
10. Restarts the PM2 process
11. Verifies the deployment with a health check to `/api/health`
12. Sends a notification (email and/or Slack, if configured)

### Rolling Back

If a deployment causes issues:

```bash
./scripts/rollback.sh
```

The server retains the last 5 releases. Rollback switches the `current` symlink to the previous release and restarts PM2.

### Apache `.htaccess` (reverse proxy + canonical host)

The deploy script generates the server's `.htaccess` on each deploy (it is not committed to the repo). It:

- Proxies all non-`/uploads/` traffic to the Next.js process (`127.0.0.1:4000` production, `40001` staging).
- Serves `/uploads/` media directly via a symlink to the shared uploads dir.
- Redirects `www.<domain>` → apex with a 301 (canonical host).

**Note on the `www` redirect:** this rule runs in Apache *after* the TLS handshake, so it only helps requests that reach the server. The Let's Encrypt certificate must therefore cover **both** the apex and the `www` subdomain — otherwise browsers that go straight to `https://www…` (Safari HTTPS-First / any client with HSTS pinned) fail the handshake with a "Not Private" error before the redirect can run. Add `www` as a SAN when issuing/renewing the cert in the hosting panel.

### PM2 Management

Common PM2 commands for managing the application on the server:

```bash
pm2 status                                    # View all running processes
pm2 logs partnersandcapital-production        # View live logs
pm2 restart partnersandcapital-production     # Restart the app
pm2 monit                                     # Real-time monitoring dashboard
```

### Health Check

The application exposes a health check endpoint at:

```
GET /api/health
```

Returns HTTP 200 when the application is running correctly. This endpoint is used by the deploy script and can be used by external monitoring services.

---

## Production Seeding

The seed script is production-aware. When `NODE_ENV=production`, it only creates:

- The **Organization** record (Partners + Capital branding)
- The **Admin user** (admin@partnersandcapital.com)
- The **Asset Classes** (Oil & Gas, Real Estate, Private Credit, Specialty)

It does **not** create any demo client accounts, investments, positions, documents, advisors, or other test data in production. All client data in production is entered manually through the admin panel.

The seed is idempotent -- it checks for existing records before creating and can be re-run safely at any time (including during deployments).

---

## Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify `DATABASE_URL` in your `.env` file is correct.
- Ensure MySQL is running and the database exists.
- Check that the database user has the correct permissions.

**"Prisma migration failed"**
- Run `npx prisma migrate dev` manually to see detailed error output.
- Ensure the database user has CREATE, ALTER, and DROP permissions.

**"NEXTAUTH_SECRET is not set"**
- Generate a secret: `openssl rand -base64 32`
- Add it to your `.env` file.

**"Port 3000 already in use"**
- Another process is using the port. Find it with `lsof -i :3000` and stop it.
- Or change the port: `PORT=3001 npm run dev`

**Setup script fails on permissions**
- Make scripts executable: `chmod +x scripts/*.sh`

**"RSA public key is not available client side"**
- This is a MySQL/MariaDB connection issue. The Prisma adapter is configured with `allowPublicKeyRetrieval: true` to handle this. If you see this error, ensure you are using the latest `src/lib/prisma.ts` and `prisma/seed.ts`.

**"pool timeout: failed to retrieve a connection"**
- Usually caused by the RSA key issue above, or by too many concurrent connections. Restart the MySQL server and retry.

---

## Password Reset

If a user forgets their password:

1. Click "Forgot your password?" on the login page.
2. Enter the email address associated with the account.
3. A reset link is sent via email (valid for 1 hour, single-use).
4. Click the link to open the reset form at `/reset-password?token=...`.
5. Enter and confirm a new password (minimum 8 characters).
6. After successful reset, log in with the new password.

The reset token is consumed on use and cannot be reused. Expired tokens are automatically cleaned up.

---

## Advisor Portal

### Overview

Advisors who accept an invitation gain access to a dedicated advisor portal at `/advisor/dashboard`. The portal provides scoped, read-only access to client portfolios based on the permission level granted.

### Advisor Acceptance Flow

1. Client invites advisor via the Advisor Access page.
2. Advisor receives a branded email with an "Accept Invitation" button.
3. Clicking the link opens `/advisor-accept?token=...`.
4. If the advisor has no account: fill in name, password, and confirm password to register.
5. If the advisor already has an account: click "Accept Invitation."
6. After acceptance, the advisor can log in and access the Advisor Portal.

### Advisor Portal Layout

- **Header:** Navy background, "PARTNERS + CAPITAL" branding, gold "Advisor Portal" badge, avatar circle
- **Sidebar:** PORTFOLIO section (Dashboard), ACCOUNT section (Log Out)
- **Light gray background** (`#f5f5f3`) on the main content area

### Advisor Dashboard (`/advisor/dashboard`)

Displays a grid of client cards showing:
- Client name and company
- Permission level badge
- Total invested and current value
- Access expiration date
- "View Portfolio" button

### Client View (`/advisor/clients/[id]`)

Shows the client's portfolio scoped by the advisor's permission level:
- **KPI cards:** Total Invested, Current Value, Total Return
- **Allocation:** Horizontal progress bars by asset class
- **Investments table:** Name, invested amount, current value, status
- **Documents:** Only shown if permission includes document access (tax docs or all docs)

### Client Documents (`/advisor/clients/[id]/documents`)

Full document list with:
- File type badge (PDF = red, DOC = blue)
- Document title, type, date, and file size
- Download button
- Scoped by permission: tax documents only, all documents, or investment-specific

### Permission Level Scoping

| Level | Dashboard | Tax Docs | Legal Docs | Reports | All Docs | Capital Activity | Investment Details |
|-------|-----------|----------|------------|---------|----------|------------------|--------------------|
| DASHBOARD_ONLY | Yes | No | No | No | No | No | No |
| DASHBOARD_AND_TAX | Yes | Yes | No | No | No | No | No |
| DASHBOARD_AND_LEGAL | Yes | No | Yes | No | No | No | No |
| DASHBOARD_AND_REPORTS | Yes | No | No | Yes | No | No | No |
| DASHBOARD_TAX_AND_LEGAL | Yes | Yes | Yes | No | No | No | No |
| DASHBOARD_TAX_AND_REPORTS | Yes | Yes | No | Yes | No | No | No |
| DASHBOARD_AND_ALL_DOCUMENTS | Yes | Yes | Yes | Yes | Yes | No | No |
| DASHBOARD_AND_CAPITAL_ACTIVITY | Yes | No | No | No | No | Yes | No |
| DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS | Yes | Yes | Yes | Yes | Yes | Yes | No |
| FULL_ACCESS | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Any level can be scoped to a single investment using the `investmentId` field on AdvisorAccess.

---

## Transactional Emails

The application sends branded transactional emails using the Elastic Email service. All emails share a consistent design:
- Navy header with "PARTNERS + CAPITAL" branding
- White card body with warm cream accents
- Navy CTA button
- Gray footer with automated message disclaimer

### Email Templates

| Template | Trigger | Recipient |
|----------|---------|-----------|
| **Advisor Invitation** | Client invites an advisor | Advisor |
| **Password Reset** | User requests password reset | User |
| **Ticket Reply** | Admin or client replies to a support ticket | Ticket owner / All admins |
| **Document Uploaded** | Admin uploads a document for a client | Client |
| **Distribution Notice** | Admin records a distribution for a client | Client |
| **Welcome Email** | Admin creates a new client account | Client (includes "Set Your Password" link, expires in 1 hour, mentions verification requirement) |
| **Onboarding Email** | Access request creates a new account | Client (3-step setup guide: set password, verify identity, verify accreditation; link expires in 24 hours) |

### Configuration

Set these environment variables for email sending:

```
ELASTIC_EMAIL_API_KEY="your-api-key"
EMAIL_FROM="noreply@partnersandcapital.com"
EMAIL_FROM_NAME="Partners + Capital"
```

If `ELASTIC_EMAIL_API_KEY` is not set, emails are silently skipped (useful for development).

---

## Real-Time Notifications

In-app notifications appear in the notification bell in the portal header. Notifications are triggered automatically by system events.

### Notification Events

| Event | Recipient | Notification |
|-------|-----------|-------------|
| Admin uploads document | Document owner | "New document: {title}" |
| Admin adds client to investment | Client | "You've been added to {investment}" |
| Admin records distribution | Client | "Distribution recorded for {investment}" |
| Admin updates client position | Client | "Your position in {investment} has been updated" |
| Admin replies to support ticket | Ticket owner | "New reply on: {subject}" |
| Admin changes ticket status | Ticket owner | "Ticket updated: {subject}" |
| Client creates support ticket | All admins | "New support ticket: {subject}" |
| Client replies to support ticket | All admins | "Client replied to: {subject}" |
| Client invites advisor | Client | "Advisor invitation sent to {email}" |

---

## Rate Limiting

The application includes an in-memory rate limiter for security-sensitive endpoints. No external dependencies (Redis, etc.) are required.

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Login (`POST /api/auth/[...nextauth]`) | 5 attempts per 15 minutes per IP |
| Forgot Password (`POST /api/auth/forgot-password`) | 3 attempts per 15 minutes per IP |
| Signup (`POST /api/auth/signup`) | 5 attempts per hour per IP |
| Password Reset (`POST /api/auth/reset-password`) | 5 attempts per 15 minutes per IP |
| Support Tickets (`POST /api/portal/support`) | 10 tickets per hour per user |
| Advisor Accept (`POST /api/auth/advisor-accept`) | 5 attempts per 15 minutes per IP |

### Implementation

Rate limiters are defined in `src/lib/rate-limit.ts` and can be imported into API routes:

```ts
import { loginLimiter } from "@/lib/rate-limit";

// In your API handler:
const rateLimitResult = loginLimiter.check(ip);
if (!rateLimitResult.allowed) {
  return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
}
```

---

## Input Validation

All user-facing API routes validate input using Zod schemas defined in `src/lib/validation.ts`. Schemas include:

- `loginSchema` -- email format, password min 8 characters
- `signupSchema` -- email, password, name required
- `resetPasswordSchema` -- token, password min 8 characters
- `resetPasswordFormSchema` -- password + confirmPassword with match refinement (client-side form validation)
- `advisorAcceptFormSchema` -- name + password + confirmPassword with match refinement (client-side form validation)
- `supportTicketSchema` -- subject (max 200), message (max 5000), category enum
- `advisorInviteSchema` -- name, email, permission level enum, optional dates
- `profileUpdateSchema` -- name, phone, company (all optional, with max lengths)
- `ticketReplySchema` -- message (max 5000)

---

## Analytics (Google Tag Manager)

Analytics is loaded exclusively through **Google Tag Manager**. There is no direct GA4 integration in the app — **GA4 is configured as a tag inside the GTM container**. (The former `NEXT_PUBLIC_GA4_ID` / direct `gtag.js` component was removed.)

GTM is enabled via the `NEXT_PUBLIC_GTM_ID` environment variable (a container id like `GTM-XXXXXXX`). When set, `GoogleTagManager` (`src/components/analytics/google-tag-manager.tsx`) is rendered as the **first child of `<body>`** in the root layout — it injects the GTM loader script (`next/script`, `afterInteractive`) and the `<noscript>` iframe fallback immediately after the opening body tag, per Google's install guidance. When it's not set (e.g., in development), the component renders nothing.

### Configuration

```
NEXT_PUBLIC_GTM_ID="GTM-XXXXXXX"
```

To collect GA4 data: in the GTM container add a **Google Tag** with your GA4 measurement id (`G-XXXXXXX`) on an **Initialization – All Pages** trigger, then **Submit → Publish**. Because `NEXT_PUBLIC_GTM_ID` is a build-time public variable, changing it requires a redeploy.

---

## Typography & Font Settings

### Overview

Admins can configure fonts, weights, styles, colors, and sizes for 5 text categories across the platform. Fonts are loaded dynamically from Google Fonts and applied via CSS custom properties.

### Typography Categories

| Category | CSS Variable Prefix | Default Font | Usage |
|----------|-------------------|--------------|-------|
| Hero Title | `--font-hero-title-*` | Playfair Display 700 | Page hero banners, blog hero titles |
| Subtitle | `--font-subtitle-*` | Open Sans 600 | Section headings, subheadings |
| Body | `--font-body-*` | Open Sans 400 | Marketing page body text |
| Admin Body | `--font-admin-body-*` | Inter 400 | Admin panel text |
| Portal Body | `--font-portal-body-*` | Inter 400 | Client portal text |

### Configuring Typography

1. Navigate to `/admin/settings`.
2. Find the "Typography" card (between Branding and Contact).
3. For each category, configure:
   - **Font Family** -- Choose from ~40 curated Google Fonts
   - **Weight** -- 100 through 900
   - **Style** -- Normal or Italic
   - **Color** -- Hex color value with preview swatch
   - **Font Size** -- CSS size value (e.g., `16px`, `1rem`)
4. Each category shows a live preview of the configured font settings.
5. Click "Save Settings" to apply.

### How It Works

- Typography settings are stored as a JSON field (`typography`) on the Organization model.
- The `FontLoader` client component reads typography from the organization context and injects:
  - A `<link>` tag to load the required Google Fonts
  - A `<style>` tag setting CSS custom properties (e.g., `--font-hero-title-family`, `--font-body-color`)
- Components use these CSS variables with fallback values, ensuring graceful degradation.
- Geist remains loaded as the base/fallback font via `next/font/google`.

### Contact Form Dynamic Data

The contact form block now pulls address, email, and phone from the organization settings instead of using hardcoded values. This means changing the contact info in Admin Settings automatically updates the contact form on the public site.

---

## Color Picker with Saved Colors

### Overview

Every color input across the admin panel uses a unified color picker component that provides:

- **Native color picker** -- Click the color swatch to open the browser's native color picker
- **Hex input** -- Type a hex color code directly (e.g., `#1A2640`)
- **Transparent option** -- Click "None" to set the color to transparent (useful for backgrounds)
- **Opacity slider** -- Adjust opacity from 0% to 100%. Colors with partial opacity are stored as 8-digit hex (`#RRGGBBAA`)
- **Saved colors palette** -- Organization-wide bookmarked colors that persist across all admin pages

### Where It Appears

The color picker replaces plain text inputs in:

- **Admin Settings** -- Primary, Secondary, and Accent branding colors; all 5 typography color fields
- **Page Block Editor** -- Background Color and Text Color fields in Text Section, Stats, CTA Banner, and Newsletter Signup blocks
- **Footer Settings** -- Background, Text, and Accent color fields

### Saving Colors

1. Set a color using the native picker or hex input.
2. Click "Save color" to add it to the organization's palette.
3. The color appears as a small circle in all color pickers across the admin panel.
4. Hover over a saved color and click the X to remove it.
5. Saved colors persist across sessions and are shared by all admin users.

### API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/saved-colors` | GET, PATCH | Admin |

---

## Editable Footer

### Overview

The marketing site footer is fully configurable from the admin panel. Admins can toggle which sections appear, customize colors, set content, and upload a footer logo.

### Admin Footer Page (`/admin/footer`)

Navigate to **Website > Footer** in the admin sidebar. The page has four cards:

1. **Modules** -- Toggle switches for each footer section:
   - **Logo** -- Display an image logo instead of the organization name text
   - **Navigation** -- Show navigation links (pulled from CMS pages with "Show in nav" enabled)
   - **Newsletter** -- Newsletter signup form
   - **Contact Info** -- Email, phone, and address (from organization settings)
   - **Tagline** -- Organization tagline text below the name
   - **Copyright** -- Copyright line with start year and entity name
   - **Disclaimer** -- Legal disclaimer text (from organization settings)

2. **Footer Logo** -- Upload or select an image from the media library. This is separate from the header logo configured in Settings.

3. **Content** -- Set the tagline text, copyright start year, and copyright entity name.

4. **Colors** -- Three color pickers for the footer's background color, text color, and accent color (used on the newsletter subscribe button).

### Default Appearance

When no footer settings have been saved, the footer renders identically to the original hardcoded design:
- Dark navy background (`#1A2640`)
- White text
- Gold accent (`#B07D3A`)
- All modules enabled except Logo (since no logo URL is set by default)

### How It Works

- Footer configuration is stored as a JSON field (`footer`) on the Organization model.
- The `OrganizationProvider` exposes the merged footer config (saved settings over defaults) to all client components.
- The marketing footer reads from the organization context and renders sections conditionally based on module toggles.
- Colors are applied via inline styles to support fully dynamic values.
- The grid layout adapts automatically based on which top-section modules (branding, navigation, newsletter) are enabled.

---

## Document Security

### Document Visibility & Scoping

Every document carries two optional assignment fields: a **client** (`userId`) and an **investment** (`investmentId`). Visibility in the client portal is determined by these two fields together:

| Client assigned? | Investment assigned? | Who can see it |
|---|---|---|
| Yes | Yes or No | **Only that one client** (and their authorized advisors). |
| No | Yes | **Every client who holds that investment** — a fund-wide document. |

The key rule: **a document assigned to a specific client is private to that client**, even when an investment is also selected. The investment field on a client-scoped document is metadata for filing/filtering only — it does **not** expose the document to other holders of that investment. Only documents left with **no client** are treated as fund-wide and shared with all holders of the selected investment.

This rule is enforced consistently across the portal document list, the dashboard "recent documents" panel, the single-file download, and the bulk ZIP download. (The admin upload dialog requires both a client and an investment, so admin-uploaded client documents are always private to the selected client.)

### Encryption

All uploaded documents (K-1s, tax forms, investment agreements) are encrypted at rest using **AES-256-GCM**:

- 256-bit key derived from the `ENCRYPTION_KEY` environment variable (64 hex characters)
- Random 16-byte IV per file (prevents identical plaintext producing identical ciphertext)
- GCM authenticated encryption (detects tampering via authentication tag)
- Files stored as `.enc` with no original filename or extension on disk

### Download Security Headers

Document download responses (both admin and portal routes) include security headers to prevent browser caching of decrypted financial documents:

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `no-store, no-cache, must-revalidate` | Prevent browser/proxy caching |
| `Pragma` | `no-cache` | HTTP/1.0 compatibility |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `Content-Disposition` | `attachment` | Force download, never inline render |

### Document Deletion

Only **SUPER_ADMIN** users can delete documents. The delete button is hidden from regular ADMIN users in both the client detail Documents tab and the admin Documents page. The API enforces this restriction server-side via `requireSuperAdmin()`.

---

## Security Headers

The application sets the following security headers on all responses via `next.config.ts`:

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

---

## Error Pages

### Error Boundary (`/error.tsx`)

A branded error boundary catches unexpected runtime errors. Displays "Something went wrong" with a "Try again" button that reloads the page.

### Custom 404 (`/not-found.tsx`)

A branded 404 page showing "Page not found" with a link back to the dashboard. Matches the site's warm cream and navy design system.

---

## Design System Colors

The portal uses a refined color palette throughout all components:

| Semantic Name | Hex | Usage |
|---------------|-----|-------|
| pc-navy | `#1A2640` | Header, buttons, hero sections |
| pc-navy-mid | `#2C3E5C` | Client sidebar background |
| pc-gold | `#B07D3A` | Accent, links, avatar bg |
| pc-gold-dark | `#7A5520` | Admin sidebar active text, gold hover |
| pc-gold-light | `#E8D5B0` | Client sidebar active text |
| bg2 | `#f5f5f3` | Main content bg, muted bg |
| bg3 | `#eeece8` | Count badges, dividers |
| border | `#dfdedd` | Card borders, dividers |
| text1 | `#1a1a18` | Headings, primary text |
| text2 | `#5f5e5a` | Sidebar text, secondary text |
| text3 | `#888780` | Muted text, section labels |
| blue-text | `#185fa5` | Links, performing status |
| red-text | `#a32d2d` | Destructive, error status |
| gold-bg | `#FDF5E8` | Pending badge bg, admin active bg |

### Status Badge Colors

| Status | Background | Text |
|--------|-----------|------|
| Active/Green | `#eaf3de` | `#3b6d11` |
| Performing/Blue | `#e6f1fb` | `#185fa5` |
| Pending/Gold | `#FDF5E8` | `#7A5520` |
| Error/Red | `#feecec` | `#a32d2d` |

---

## Admin "View as Client" (Impersonation)

### Overview

Admins can view the client portal exactly as a specific client sees it -- same layout, data, and experience -- without being able to modify anything. This is useful for support, troubleshooting, and verifying a client's view.

### Starting Impersonation

1. Navigate to `/admin/clients/[id]` (the client detail page).
2. Click the **"View as Client"** button next to "Edit Client."
3. The browser redirects to the client's `/dashboard`, showing their portal with all their data.
4. An **amber banner** appears at the top of every page: "Viewing as [Client Name] -- Read-only mode" with an **Exit** button.

### Read-Only Enforcement

While impersonating, **all write operations are blocked** with a 403 error:

- Profile updates (name, phone, company)
- Password changes
- 2FA setup, verify, and disable
- Support ticket creation and replies
- Advisor invitations, edits, revocations, and resends
- Marking notifications as read

All read operations work normally -- the admin can browse the dashboard, portfolio, documents, distributions, advisors, notifications, settings, and support tickets as the client sees them.

### Exiting Impersonation

Click the **"Exit"** button in the amber banner. The admin is redirected back to the client's admin detail page (`/admin/clients/[id]`).

Impersonation also expires automatically after 1 hour.

### Audit Trail

Two audit log entries are created for each impersonation session:

| Action | Logged When |
|--------|------------|
| `IMPERSONATE_START` | Admin clicks "View as Client" |
| `IMPERSONATE_END` | Admin clicks "Exit" |

Both entries record the admin's user ID and the target client ID.

### Security

- Only users with `ADMIN` or `SUPER_ADMIN` role can impersonate.
- The impersonation cookie is HTTP-only, secure (in production), and scoped to the session.
- The server validates the admin's real JWT role on every request -- the cookie alone is not sufficient.
- Non-admin users cannot set or use the impersonation cookie.

### API Route

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/impersonate` | POST | Start impersonation (body: `{ clientId }`) |
| `/api/admin/impersonate` | DELETE | End impersonation (clears cookie) |

---

## Custom Document Types

### Overview

Document types (K-1, Tax 1099, Quarterly Report, etc.) are fully customizable by admins. The system ships with 10 default types but admins can add and remove types from the admin Documents page.

### Managing Document Types

1. Navigate to `/admin/documents`.
2. Click the **"Manage Types"** button (outline variant, next to "Upload Document").
3. The dialog shows all document types with:
   - Label and value code
   - "Default" badge on the 10 original types (informational only -- not a delete guard)
   - Document count badge showing how many documents use each type
   - Delete button (trash icon) for each type
4. **Add a type:** Enter a label in the input at the bottom and click "Add" (or press Enter). The value code is auto-generated from the label (e.g., "My Type" becomes "MY_TYPE").
5. **Delete a type:**
   - If 0 documents use the type: a confirmation modal asks "Delete {label}?" -- click Delete to confirm.
   - If documents use the type: a warning modal lists the affected documents with client and investment names. The message reads "Change their document type first, then return to delete."
   - Any type (including defaults) can be deleted as long as no documents reference it.

### Where Custom Types Appear

- **Admin Documents page:** Filter dropdown and badge labels
- **Document Upload dialog:** Type selector
- **Portal Documents page:** Type badges on document cards (custom types show their label, unknown types fall back to the value with underscores replaced by spaces)

### API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/document-types` | GET, POST | Admin |
| `/api/admin/document-types/[id]` | DELETE | Admin |

**GET** returns all types ordered by sortOrder with a `documentCount` per type. **POST** creates a new type from `{ label }`. **DELETE** returns 409 with affected documents if the type is in use, or deletes if unused.

### Default Document Types

| Value | Label |
|-------|-------|
| K1 | K-1 |
| TAX_1099 | Tax 1099 |
| QUARTERLY_REPORT | Quarterly Report |
| ANNUAL_REPORT | Annual Report |
| SUBSCRIPTION_AGREEMENT | Subscription Agreement |
| CAPITAL_CALL_NOTICE | Capital Call Notice |
| DISTRIBUTION_NOTICE | Distribution Notice |
| PPM | PPM |
| INVESTOR_LETTER | Investor Letter |
| OTHER | Other |

---

## Distribution Management

Distributions record cash payments to LPs (limited partners) per client position within an investment. Each distribution is linked to a specific `ClientInvestment` position and tracks amount, date, type, and optional notes.

### Centralized Distributions Page

The **Distributions** page (`/admin/distributions`) provides a centralized view of all distributions across all investments, accessible from the sidebar under MANAGE.

**Features:**
- **Table** showing Date, Client, Investment, Amount, Type, Notes, and Status for every distribution
- **Search** by client name or investment name
- **Filter** by distribution type (Cash, Reinvestment, Return of Capital) and by investment
- **Pagination** for large datasets
- **Record Distribution** button opens a two-step dialog:
  1. Search for a client position by name or email
  2. Fill in the distribution details (amount, date, type, notes)

### Recording a Single Distribution

Distributions can also be recorded from within an individual investment:

1. Navigate to **Admin > Investments > [Investment Name]**
2. Open the **Client Positions** tab
3. Click the **Distribution** button on the client's row
4. Fill in the form:
   - **Amount** — the dollar amount being distributed (required)
   - **Payment Date** — the date of the distribution (required)
   - **Type** — Cash Distribution (default), Reinvestment, or Return of Capital
   - **Notes** — optional description matching the spreadsheet "Notes" column
5. Click **Record Distribution**

The system will:
- Create a Distribution record with status COMPLETED
- Increment the client position's `cashDistributed` total
- Send the client an in-app notification and email

### Bulk CSV Import

1. From the **Distributions** tab, click **Bulk Upload**
2. Select the **CSV Import** tab
3. Upload a CSV file or paste CSV data with these columns:
   - `Email` (required) — client email to match against positions in this investment
   - `Amount` (required) — distribution amount (supports `$` and `,` formatting)
   - `Date` (required) — payment date in **MM/DD/YYYY** format
   - `Notes` (optional) — description
4. Click **Preview Import** — the system shows a full preview table:
   - Matched rows show a green checkmark with the client name, amount, and date
   - Unmatched rows (email not found, invalid amount/date) show a warning with the reason
   - A summary shows total matched, total skipped, and total dollar amount
5. Review the preview and click **Import N Distributions** to confirm

Bulk CSV imports are **silent** — no email or in-app notifications are sent to clients. Unmatched rows are skipped; only matched rows are imported.

### Pro-Rata Allocation

1. From the **Distributions** tab, click **Bulk Upload**
2. Select the **Pro-Rata** tab
3. Enter the **Total Distribution Amount** for the fund this period
4. Select the **Date**
5. Click **Allocate Pro-Rata**

The system divides the total proportionally by each active position's `amountInvested`. Cent rounding uses largest-remainder method so allocated amounts sum exactly to the total.

### APR (Admin Only)

Each client position has an optional **APR** field visible only to admins. This field (`adminApr` on `ClientInvestment`) stores the annual percentage rate specific to that client's position. It appears in the Client Positions table on the admin investment detail page. APR is never exposed to the client portal.

### Editing Distributions and Contributions

Admins can edit existing distribution and contribution records from two locations:

- **Investment Detail Page** (`/admin/investments/[id]`): In the Distributions tab, click the pencil icon on any distribution row to open the edit dialog.
- **Centralized Distributions Page** (`/admin/distributions`): Click the pencil icon on any distribution row.

The edit dialog allows updating:
- **Amount** -- Changing the amount automatically adjusts the `cashDistributed` total on the client position (increments or decrements by the difference).
- **Date and Time** -- Full date and time editing via the DatePicker and time input.
- **Type** -- Cash Distribution, Reinvestment, or Return of Capital.
- **Status** -- Completed, Pending, or Cancelled.
- **Notes** -- Optional description text.

Contribution records can be edited from the investment detail page with similar fields (amount, date/time, status, notes).

All edits are recorded in the audit log with `UPDATE_DISTRIBUTION` or `UPDATE_CONTRIBUTION` actions.

### cashDistributed Sync

The `cashDistributed` field on each `ClientInvestment` is kept in sync with Distribution records. When a distribution is created, `cashDistributed` is incremented by the distribution amount within the same database transaction. The client portal reads this field for the "Cash Distributed" KPI card.

### Client Portal: Capital Activity Chart

When a client views an investment with distribution and contribution history, a **Capital Activity** chart appears in the Overview tab. This chart shows:
- **Gold bars**: monthly distribution amounts
- **Navy line**: cumulative capital deployed over time
- **Green line**: cumulative distributions over time

The chart only renders when there are 2 or more months of data. Data comes from the existing contributions and distributions already returned by the portal API.

---

## Soft Delete (Investments & Clients)

Investments and clients can be soft-deleted by **Super Admins only**. Soft delete hides records from normal views without destroying any data. Archived clients can be **unarchived from the UI** (see below); other soft-deleted records can be reversed by a database administrator.

### Deleting an Investment

1. Navigate to **Admin > Investments** and click an investment to open its detail page.
2. Click the red **Delete** button in the top-right header (visible only to Super Admins).
3. A confirmation dialog will appear explaining that client positions and related data will be preserved.
4. Click **Delete** to confirm. You will be redirected to the investments list.

### Deleting a Client

Clients can be deleted from two places:

- **Client List Page**: Click the archive icon on any active client row (Super Admin only). A confirmation dialog will appear.
- **Client Detail Page**: Click the red **Delete** button in the top-right header (Super Admin only). A confirmation dialog will appear. You will be redirected to the client list after confirming.

In both cases, the client's investment data is preserved. Deleted clients appear under the **Archived** tab on the client list page.

**Cascade:** Archiving a client also soft-deletes (with one shared timestamp) their **positions, contributions, and distributions**, so they drop out of fund AUM/totals while archived. Unarchiving re-activates **exactly** those rows (matched by that timestamp), leaving any independently/manually deleted rows untouched. Clients archived before this behavior existed simply have nothing to cascade-restore. Additionally, a client's investment list now hides positions whose **fund itself was soft-deleted** (previously these showed as clickable rows that 404'd with "Investment not found").

### Viewing Deleted Investments

1. Navigate to **Admin > Investments**.
2. Toggle **Show Deleted** (visible only to Super Admins) in the filter bar.
3. Deleted investments appear with a red "Deleted" badge and dimmed row styling.
4. Click a deleted investment to view its detail page (read-only context; all data is preserved).

### Viewing Deleted Clients

Use the existing **Archived** tab on the client list page to see deleted/archived clients.

### Unarchiving a Client

The **unarchive** action is available on the archived-client rows of both the **Clients** list page (`/admin/clients`) and the **Client Management** table on the admin dashboard (`/admin`).

1. On either page, switch to the **Archived** tab.
2. Click the **unarchive** icon (Super Admin only) on the archived client's row. A confirmation appears.
3. Click **Unarchive** — the client's `deletedAt` is cleared and they return to the **Active** tab and active views (regaining portal access if their account status allows). The action is audit-logged as `RESTORE_CLIENT` (`POST /api/admin/clients/[id]/restore`). If an active account already uses that email, the restore is blocked with a clear message to avoid a unique-constraint collision.

### Permissions

- Only users with the **SUPER_ADMIN** role can delete investments or clients.
- Regular admins will not see delete buttons and the API will reject unauthorized delete requests.

---

## Delete Client Positions

Super Admins can remove individual client positions from an investment's Client Positions tab.

### Removing a Position

1. Navigate to **Admin > Investments > [Investment Name]**.
2. Open the **Client Positions** tab.
3. Click the trash icon on the client's row (visible only to Super Admins).
4. A confirmation dialog appears: "Are you sure you want to remove {client}'s position? Distribution and contribution records will be preserved. This action can be reversed."
5. Click **Remove** to confirm. The position is soft-deleted and disappears from the table.

### Permissions

- Only **SUPER_ADMIN** users can delete client positions. The API enforces this via `requireSuperAdmin()`.
- Regular admins will not see the trash icon and the API will reject unauthorized delete requests.

---

## Access Requests

Prospective clients can request access to the investor portal directly from the login page, replacing the previous email link.

### How It Works (Public)

1. On the login page, click **"Not a client? Request access"** below the login form.
2. A dialog opens with fields for Full Name (required), Email (required), and Phone (optional).
3. Below the phone field, an **SMS consent checkbox** (unchecked by default) allows users to opt in to receive text messages. The checkbox includes TCPA-compliant disclosure text with message frequency, data rates, STOP/HELP instructions, and links to the Privacy Policy and Terms of Use (open in new tabs).
4. Click **"Yes, Sign Me Up!"** to submit. A confirmation message appears on success.
5. The request is saved to the database (including SMS consent status) and an email notification is sent to theteam@partnersandcapital.com showing whether the user opted in.
6. Rate limited to 3 requests per hour per IP address.

### Admin Management

Navigate to **Manage > Access Requests** in the admin sidebar. The page shows:

- **Table columns:** Name, Email, Phone, SMS (Opted In badge or --), Status (PENDING/REVIEWED), Date, Actions
- **Filter:** Filter by status (All/Pending/Reviewed)
- **Full CRUD:**
  - **Create:** "New Request" button opens a dialog to manually log a request (name, email, phone, SMS opt-in, status) — e.g. one received by phone or email.
  - **Update:** Per-row **Edit** opens the same dialog to change any field; a one-click status toggle switches **Mark Reviewed ⇄ Mark Pending** (reviewed rows are no longer dead-ends).
  - **Delete:** Per-row trash icon with a confirm dialog.
- **Filter:** Filter by status (All/Pending/Reviewed)
- **Pagination:** Standard pagination for large lists
- **Sidebar badge:** Shows the count of pending requests in the admin sidebar
- All create/update/delete actions are audit-logged.

### Login Page Redesign

The login page uses a split-panel layout:

- **Left panel (navy):** "PARTNERS + CAPITAL" branding, "Your capital. A clear view." headline, live stats from `/api/stats` (deployed capital, avg net return, asset classes), and disclaimer text.
- **Right panel (white):** Multi-step login flow with step indicator dots (email, password, 2FA verification), form fields, and the "Request access" button below a divider.

### API Routes

| Route | Methods | Auth | Rate Limit |
|-------|---------|------|------------|
| `/api/access-requests` | POST | Public | 3/hour per IP |
| `/api/admin/access-requests` | GET, POST | Admin | -- |
| `/api/admin/access-requests/[id]` | PATCH, DELETE | Admin | -- |

### Email Notification

When an access request is submitted, a branded email is sent to theteam@partnersandcapital.com containing the requester's name, email, and phone number. The email follows the standard Partners + Capital email template.

---

## Activity Feed

The Activity Feed lets admins post updates and announcements visible to clients on their dashboards.

### CRUD Operations

- **Create**: Post a new update from Admin > Activity Feed > "Post Update"
- **Edit**: Click the pencil icon on any entry to modify title, content, targeting, or banner settings
- **Delete**: Click the trash icon on any entry to soft-delete it (confirmation required)

### Banner Feature

Activity feed messages can be displayed as a prominent banner above the client portal header:
- Toggle "Show as banner on client portal" when creating or editing a post
- The banner appears in gold (#B07D3A) with dark navy text at 18px Inter font
- Only the most recent active banner is shown
- Clients can dismiss the banner for their session
- Banners work with both broadcast messages and targeted messages

### Dynamic Sidebar Counts

Admin sidebar navigation counts (Clients, Investments, Documents, etc.) update dynamically as you navigate between pages. No page refresh is needed to see updated counts after adding or deleting records.

---

## Admin Avatar Upload

Admins can upload a profile avatar from Admin > Settings > Profile Avatar section:
- Supported formats: JPEG, PNG, WebP, GIF (max 2MB)
- The avatar displays in the admin header navigation bar
- Upload and remove functionality available
- Uses the same avatar API as the client portal settings

---

## Blog Category Post Counts

Blog categories display the number of published posts assigned to each category in the admin table.

---

## Tax Center

The Tax Center is a dedicated tab on the portal Documents page (`/documents`) that provides a streamlined experience for accessing tax documents during tax season. It organizes K-1 and 1099 documents by year and investment, making it easy for investors to find and download their tax forms.

### Features

- **Year-based organization:** Tax documents are grouped by tax year with pill-style selectors for quick navigation.
- **Investment grouping:** Within each year, documents are displayed in cards grouped by investment name.
- **Bulk download:** A "Download All" button downloads every tax document for the selected year.
- **New document indicators:** Documents uploaded within the last 30 days display a "New" badge; older documents show "Available."
- **Tax season reminder:** A banner at the top reminds investors that K-1 forms are typically available by March 15 and provides a link to grant CPA access.
- **Previous years:** A collapsible section provides access to tax documents from prior years in a compact list format.
- **Lazy loading:** Tax documents are only fetched from the API when the Tax Center tab is first opened, not on initial page load.

### API

The documents API (`/api/portal/documents`) supports a `category` query parameter:

- `category=TAX` returns documents of type K1 and TAX_1099
- `category=REPORTS` returns QUARTERLY_REPORT and ANNUAL_REPORT
- `category=LEGAL` returns SUBSCRIPTION_AGREEMENT, PPM, and INVESTOR_LETTER
- `category=CAPITAL` returns CAPITAL_CALL_NOTICE and DISTRIBUTION_NOTICE

The `pageSize` parameter supports values up to 500 (previously 100).

---

## Feature Roadmap

| Phase | Name                         | Status      |
| ----- | ---------------------------- | ----------- |
| 1     | Foundation                   | Completed   |
| 2     | Admin Panel + CRUD           | Completed   |
| 3     | Client Portal + Mockup UI   | Completed   |
| 4     | Advisor Sharing              | Completed   |
| 5     | Integrations & Notifications | Completed   |
| 6     | Hardening & Analytics        | Completed   |
| 7     | Blog, Page Builder & Marketing Site | Completed |
| 8     | Visual Redesign                     | Completed |

### Completed Features

- Full admin CRUD for clients, investments, documents, activity feed
- Client portal with dashboard (full + empty states), portfolio, documents, distributions
- Design-aligned UI matching all 6 mockup screenshots
- Advisor access with 10-tier granular permission levels and access logging
- Full advisor portal with dashboard, client view, and scoped document access
- Advisor invitation and acceptance flow with branded emails
- Password reset flow (page + API + email)
- Support ticket system (client submission + admin management)
- Real-time in-app notifications wired to all major system events
- Transactional emails for all major events (6 branded templates)
- CSV export for admin client list
- Two-factor authentication (TOTP)
- Audit logging for all admin actions
- In-memory rate limiting on security-sensitive endpoints
- Zod input validation schemas for all user-facing forms
- Google Analytics 4 integration (env-driven)
- Security headers (X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy)
- Custom error boundary and 404 page
- Production-aware database seeding
- All timestamps standardized to America/New_York (ET) timezone
- Custom branded date picker component (react-day-picker v9)
- Public marketing website with header, footer, and newsletter signup
- Blog system ("Partner Thoughts") with categories, tags, rich text editor, SEO metadata
- Page builder with 17 drag-and-drop block types and live preview
- Media library with upload, browse, and picker integration
- Contact form with rate limiting and email notification
- Marketing header with transparent-to-solid scroll effect
- Tiptap rich text editor with full toolbar and media picker integration
- 11 seed blog posts and 2 seed CMS pages (homepage + contact)
- Portal visual redesign with refined color palette matching reference design
- Client sidebar changed from white to navy-mid (#2C3E5C) with gold active states
- Admin sidebar changed to navy-mid to match client portal
- Portal-identifying header badges (Client Portal, Admin Portal, Advisor Portal)
- Consistent status badge colors across all pages (green/blue/gold/red palette)
- Login redirect fix: authenticated users without homepage redirect to their portal
- Admin "View as Client" impersonation with read-only enforcement and audit logging
- CMS page navigation visibility controls (show in nav, nav label, nav order)
- Blog page designation (render blog listing on any CMS page URL)
- Dynamic header/footer navigation driven by database instead of hardcoded links
- Page hero images with shared PageHero component (pages and blog posts)
- Admin-configurable typography with Google Fonts (5 categories, CSS variable injection)
- Dynamic contact form pulling address/email/phone from organization settings
- 2FA policy enforcement (mandatory redirects to setup, disabled hides 2FA, optional preserves existing behavior)
- Global color picker with native picker, hex input, transparent option, opacity slider, and organization-wide saved color palette
- Editable footer with toggleable modules (logo, navigation, newsletter, contact, tagline, copyright, disclaimer) and customizable colors
- Media picker integration on Logo URL and Favicon URL fields in admin settings (browse/upload button with image preview)
- Favicon override (white-label): the built-in favicon comes from the file-convention icons `src/app/icon.png` + `src/app/favicon.ico` (both derived from the brand mark, emitted with hashed cache-busting URLs). When an organization sets a **Favicon URL** in Settings → Branding, `OrganizationProvider` overrides it at runtime — it removes the default `<link rel="icon">` tags and injects one pointing at the org favicon, so the configured favicon wins. This matches how the rest of branding (colors, logo, name) is applied client-side, keeping pages statically prerendered. If no org favicon is set, the built-in default is used.
- SEO-friendly media filenames (slugified original names instead of UUIDs) with in-place rename support
- Drag-and-drop file upload in media picker (in addition to click-to-upload)
- Drag-and-drop reordering for logo gallery items in the page block editor
- Hero video block redesign: left-aligned layout, staggered fadeUp animations, tagline, `*italic*` gold text heading, dual CTAs, dynamic investment stats, gold divider, scroll hint
- Public stats API (`/api/stats`): total capital deployed, weighted avg net return, asset class count
- 4 new page builder block types: Asset Cards, Philosophy, Process Steps, CTA Split
- Shared `parseHeading()` utility for `*italic*` gold text and line break support across blocks
- Block editor font-size and font-weight controls on every text element with hint defaults
- Rich text editor (TipTap) font-size toolbar dropdown for inline font sizing
- Missing FontField controls added for CTA buttons (hero blocks), sidebar tagline/label (process steps), secondary CTA (cta-split)
- Auth pages (login, forgot-password, reset-password, advisor-accept) use the standard marketing header, footer, and typography
- Login page stats bar pulls live data from `/api/stats` (capital deployed, client count, investment count)
- Block editor FontField hints now show the actual admin typography defaults (font family, weight, size) instead of hardcoded values
- Heading CSS rules use `!important` with CSS custom properties: admin defaults always apply, block-editor overrides feed through `resolveBlockFontVars()` which sets `--font-h2-size` etc. on the element
- FAQ block redesign: sectioned layout with roman-numeral headers, sticky sidebar navigation with IntersectionObserver scroll tracking, serif question text, HTML-rich answers (`dangerouslySetInnerHTML`) with styled lists (gold dash markers) and callout notes (gold left border + cream bg), single-open accordion behavior across all sections. Backward compatible with legacy flat `items` format
- Hero image block enhancements: text alignment (left/center/right), optional tagline with decorative dash, grid pattern overlay, radial gradient overlay, bottom gold gradient divider line
- PageHero enhancement: rich hero content fields per page (tagline, subtitle, description, grid pattern, bottom divider) editable from admin sidebar. Left-aligned layout matching brand mockup with serif typography, gold italic accents, and HTML support. Blog listing pages pass hero fields through to the shared PageHero component
- Custom document types: admin-managed document types with add/delete from the Documents page, database-backed types replacing hardcoded enum, warning modal for types with existing documents, dynamic type selectors in upload dialog and filter dropdowns
- Distribution management: per-client distribution recording with amount/date/type/notes, bulk CSV import matching clients by email, pro-rata fund-level allocation with cent rounding, admin-only APR field per position, `cashDistributed` kept in sync via transactions, client notifications and emails on distribution recording
- Capital Activity chart on portal investment detail: ComposedChart with monthly distribution bars (gold), cumulative deployed line (navy), and cumulative distributions line (green)
- Delete client positions: Super Admin trash icon on Client Positions tab with soft delete and confirmation modal
- Access request system: login page "Request access" modal with name/email/phone form, database storage, branded email notification to theteam@, admin management page with mark-as-reviewed workflow
- Login page redesign: split-panel layout with navy branding panel (headline, live stats, disclaimer) and white form panel with multi-step flow (email, password, 2FA) and step indicator dots
- Role-based login redirect: clients go to `/dashboard`, admins/super-admins go to `/admin`, advisors go to `/advisor/dashboard`
- Client profile avatar upload: clients can upload a profile photo (JPEG, PNG, WebP, GIF, max 2MB) from the settings page, displayed in the portal header and settings page with initials fallback
- SMS opt-in consent: TCPA-compliant SMS consent checkbox on the access request form with carrier-required disclosures (message frequency, data rates, STOP/HELP instructions), smsConsent field stored in database, consent status shown in admin notification email and admin access requests table
- Privacy Policy page (`/privacy-policy`): carrier-compliant privacy policy with SMS program terms, mobile number non-sharing statement, data collection/usage/cookies/security sections
- Terms of Use page (`/terms-of-use`): carrier-compliant terms including SMS program description, opt-out/help instructions, supported carriers disclaimer, IP, limitation of liability, and governing law
- KYC & Accredited Investor Verification: multi-step wizard gates portal access for new clients per Reg D 506(c) and OFAC requirements. Verification model tracks identity (legal name, DOB, country, address, government ID) and accreditation (basis selection from 5 options, supporting document upload). Documents encrypted with AES-256 via existing upload system. Five wizard screens: welcome gate, identity form with ID upload, accreditation selection with doc upload, review with consent checkboxes, and pending status. Verification gate in portal layout does a DB check so admin approval takes effect without re-login. Admin creates Verification record (NOT_STARTED) on client creation. Admin sidebar shows "Verifications" with pending count badge. Admin list page with status filter and search. Admin detail page shows all submitted data with document download links and approve/reject workflow with optional notes. Rejection allows client to re-submit. Audit log entries for submit/approve/reject. Client and admin notifications on submission and review. Routes: `/verify` (client wizard), `/admin/verifications` (admin list), `/admin/verifications/[id]` (admin detail). API: `/api/portal/verify` (GET/PATCH), `/api/portal/verify/upload` (POST), `/api/portal/verify/submit` (POST), `/api/admin/verifications` (GET), `/api/admin/verifications/[id]` (GET/PATCH), `/api/admin/verifications/[id]/download` (GET). Client detail page shows KYC status badge linking to verification detail.
- Verification flow overhaul: Access requests now create real user accounts (role=CLIENT, accountStatus=PENDING) with a Verification record (NOT_STARTED) and a 24-hour password reset token. New onboarding email template sent to new users with 3-step setup guide (set password, verify identity, verify accreditation). Existing users submitting access requests only create an AccessRequest record for admin tracking (anti-enumeration). Wizard UI redesigned with updated copy: gate screen ("Before we hand over the keys"), identity screen with chip-style ID type selector, accreditation screen with green privacy note, review screen with status badges, and pending screen with hourglass icon and step-by-step status. Accreditation document uploads also create a Document vault record (type ACCREDITATION_LETTER) so docs appear in the client's Documents page. Welcome email updated to mention verification requirement. Verify layout badge changed to subtle "Secure verification". Login access request success message updated to mention setup instructions email. Bank Statement removed from accreditation doc types.
- Verification refinements: Date of birth field removed from identity screen and submit validation. Bypass toggle on gate screen for existing clients (accountStatus=ACTIVE) — toggle lets them skip verification and go directly to portfolio. Email notification sent to theteam@partnersandcapital.com when a client submits verification. Approval email sent to client when admin approves verification (includes login link), and user accountStatus set to ACTIVE. Soft-deleted users properly handled in access request flow (restored instead of blocked by unique constraint).
- Verification soft delete (CRUD parity): The admin Verifications list (`/admin/verifications`) now has a per-row **Delete** action (trash icon → confirm dialog) that **soft-deletes** the verification record, matching the site-wide soft-delete convention. The `Verification` model gains a `deletedAt DateTime?` column (+ `@@index([deletedAt])`, migration `20260706140000_add_verification_soft_delete`); `DELETE /api/admin/verifications/[id]` sets `deletedAt` (never hard-deletes) and writes a `VERIFICATION_DELETED` audit log entry. All read paths now exclude soft-deleted rows: the list (`GET /api/admin/verifications`, with an optional `includeDeleted=true` param for parity), the detail (`GET /[id]`), the approve/reject (`PATCH /[id]`), and the document download (`GET /[id]/download`) all filter `deletedAt: null`. (Create happens automatically when an admin creates a client / on access-request onboarding; Read = list + detail; Update = approve/reject; Delete = soft delete.)
- Manual KYC approval: Admin client detail page shows an "Approve KYC" button next to the KYC status badge when the client's verification is not yet approved (or doesn't exist). Clicking it creates a Verification record (if needed) with status APPROVED, sets accountStatus to ACTIVE, creates an audit log entry, and sends the client a notification. This is for existing clients who don't need to go through the full verification wizard. API: `POST /api/admin/clients/[id]/approve-kyc`.
- Auth form show/hide password toggle: Eye icon button on password fields across login, reset-password, and advisor-accept forms. Click to toggle between masked and visible password text. Uses `Eye`/`EyeOff` icons from lucide-react.
- Auth form client-side Zod validation: All 4 auth forms (login, forgot-password, reset-password, advisor-accept) now validate inputs using Zod schemas from `src/lib/validation.ts` before submitting. Per-field inline error messages displayed below inputs in red. Login validates email format before advancing to password step. Reset-password and advisor-accept validate password length and confirm-password match with per-field errors.
- Edit distributions and contributions: Admin can edit date/time, amount, type, status, and notes on existing distribution and contribution records. Pencil icon on distribution rows in both investment detail and centralized distributions page. Amount changes on distributions automatically adjust the client position's `cashDistributed` total via database transaction. All edits recorded in audit log.
- Multiple blog categories per post: Blog posts now support multiple categories via a junction table (`BlogPostCategory`). Category selector changed from single-select dropdown to multi-select checkboxes in both create and edit blog pages. Public blog pages show multiple category badges per post. Existing single-category posts migrated automatically.
- Secure Communications: Bank-style messaging system replacing the Activity Feed. Both admins and clients can send threaded messages. Email notifications contain no message content (just "you have a secure message — log in to read it"). Broadcasts send to all clients; clients can reply privately to broadcasts (spawns a new private thread). Banner functionality preserved via `showAsBanner` toggle on broadcasts. Admin page at `/admin/activity` renamed to "Communications" with compose dialog, filter tabs (All/Broadcasts/Targeted), search, thread list with unread indicators, and thread detail dialog with reply. Portal page at `/messages` with compose form, thread list, and thread detail dialog. Sidebar shows unread badge. Notification bell shows gold mail icon for SECURE_MESSAGE type. Data model: `MessageThread` (conversations), `Message` (individual messages), `MessageReadReceipt` (per-user read tracking). Old `ActivityFeed` model soft-deprecated. Login unread modal: when a client logs in with unread messages, a dialog automatically appears with a "Read Messages" link to `/messages` (shown once per session via sessionStorage). API routes: `/api/admin/messages` (list, compose), `/api/admin/messages/[id]` (detail, reply, update, delete), `/api/portal/messages` (list, compose), `/api/portal/messages/[id]` (detail, reply), `/api/portal/messages/unread-count`, `/api/portal/banners` (updated to use MessageThread).
- PaginationControls component (`/src/components/ui/pagination-controls.tsx`): Shared pagination component used across all admin pages. Renders "Showing X-Y of Z" text, numbered page buttons with ellipsis for large page counts (up to 7 visible), and chevron prev/next buttons. Automatically hides when totalPages <= 1. Props: `page`, `totalPages`, `total`, `pageSize`, `onPageChange`. Replaces the previous inline Previous/Next button pattern in all 13 admin pages (dashboard, clients, investments, distributions, documents, blog, media, users, verifications, access-requests, advisors, audit-log, activity/communications).
- Monthly Client Statements: Automated statement generation system with PDF rendering, dynamic banners, and compliance-focused approval workflow. **Statement Generation**: Collects all client investment data (positions, contributions, distributions, ROI/IRR/APR metrics), renders a branded HTML statement matching the P+C design system (navy header, gold accents, Cormorant Garamond headings), generates server-side SVG charts (combined portfolio performance + per-investment mini charts), converts to PDF via Puppeteer, and encrypts with AES-256-GCM (same as documents). **Admin Queue** (`/admin/statements`): Status tabs (Pending/Approved/Sent/Rejected), generate button with month/year picker + client selection + month-to-date option, preview PDFs in new tab, approve/reject/regenerate per statement, bulk approve/reject with checkboxes. All actions audit-logged. **Banner System** (`/admin/statements/banners`): Library of reusable promotional banners with WYSIWYG preview, image-on-left with gradient fade to text/CTA on right, assign banners to specific months/years + all clients or selected individuals, track which banners appeared on which statements. **Statement Disclosures**: Editable in admin Settings page under new "Statement Disclosures" accordion, pre-seeded with 6 standard financial disclosures (Confidentiality, Illiquidity Risk, Performance, Fees, Tax/Legal, Report Discrepancies). **Client Detail** (`/admin/clients/[id]` Statements tab): Generate statements for individual clients, view history, preview/approve/reject inline. **Scheduling**: node-cron runs at 6 AM on the 1st-4th of each month, checks if today is the 2nd business day (skipping weekends + US bank holidays via Nager.Date API, cached in DB), auto-generates previous month's statements for all active clients with investments. Admins receive email notification when batch is ready for review. **Client Portal**: Auto-generated statements (once approved) merge into existing Statements tab on Documents page alongside manually uploaded STATEMENT documents. Clients receive email notification with "View Statement" CTA when approved. **Settings Refactor**: All admin settings sections (Branding, Typography, Contact, Compliance, Security, Avatar) converted from Cards to Accordions for cleaner organization. **Sidebar**: "Statements" added to MANAGE section with pending-approval count badge. **Statement Content** (`/admin/statements/content`): Per-investment market commentary and upcoming distributions, managed per month/year. Market commentary appears below the investment's activity tables in the PDF. Upcoming distributions show expected payment dates and amounts. Both are granular per investment — if a client holds that investment, they see the content. New investments are automatically available in the content dropdowns. **PDF Enhancements**: Banners rendered via satori (pixel-perfect with web preview), one investment per page, continuation headers with mini logo + date on pages 2+, page numbers in footer ("Page X of Y"), dynamic banner height (min 82px, grows with content). Database models: Statement, StatementBanner, StatementBannerAssignment, StatementBannerPlacement, StatementDisclosure, StatementCommentary, StatementUpcomingDistribution. Dependencies: pdfkit (PDF generation), satori (banner rendering), sharp (image processing), node-cron (scheduling). API routes: `/api/admin/statements` (list), `/api/admin/statements/generate` (batch generate), `/api/admin/statements/[id]/preview` (decrypt PDF), `/api/admin/statements/[id]/approve`, `/api/admin/statements/[id]/reject`, `/api/admin/statements/[id]/regenerate`, `/api/admin/statements/bulk-approve`, `/api/admin/statements/bulk-reject`, `/api/admin/statements/banners` (CRUD), `/api/admin/statements/banners/[id]/assign`, `/api/admin/statements/banners/[id]/assignments`, `/api/admin/statements/disclosures` (CRUD + reorder), `/api/portal/statements` (client list), `/api/portal/statements/[id]/download`.

- Statement notification & email deep-linking: When a statement is approved/sent, clients now receive **both** an in-app bell notification ("New Statement Available", linking to `/documents?tab=statements`) and an email. The email's **"View Statement"** button now links directly to the statement PDF (`/api/portal/statements/[id]/download`) instead of the dashboard. The download route gates on login and per-user ownership: a logged-out (or 2FA-incomplete) visitor is redirected to `/login?callbackUrl=<pdf>` and, after signing in, is returned straight to their PDF — the login page now honors a safe relative `callbackUrl` instead of always landing on the role-based home page. Statement PDFs remain encrypted at rest (AES-256-GCM via `ENCRYPTION_KEY`); they are decrypted only when served to the authenticated, authorized owner (status APPROVED/SENT). `callbackUrl` is validated to be a relative path (must start with `/`, not `//`) to prevent open redirects.

- Disclosure placement (statements / emails / blog): Disclosures (Settings → **Disclosures**, formerly "Statement Disclosures") have per-disclosure toggles — **Show on statements**, **Show on emails**, and **Show on blog** — so each disclosure can target any combination. `showOnBlog` (default false; migration `20260627120000_add_disclosure_show_on_blog`) renders the active blog disclosures as fine print at the **bottom of each blog post** (`/blog/[slug]`), below the tags. (Original two toggles:) `StatementDisclosure` gains `showOnStatements` (default true) and `showOnEmails` (default false); existing disclosures stay statements-only. **Statements:** only `showOnStatements` disclosures render, and the Disclosures section now starts on its **own final page** (after all content). **Emails:** every outgoing email includes the `showOnEmails` disclosures **just above the footer** — injected centrally in `sendEmail()` via `injectEmailDisclosures()` (a `<!--EMAIL_DISCLOSURES-->` marker in `emailWrapper`, 1-minute cache), so it covers all templates (statement-ready, welcome, access requests, password reset, etc.). The enable/disable button still hides a disclosure everywhere. Migration `20260626130000_add_disclosure_placement` (additive booleans). The disclosure **title is an internal label only** (used to identify it in admin) and is **not** rendered on statements or emails. The **body is edited with the standard rich-text (WYSIWYG) editor** (`RichTextEditor` / tiptap, auto-saved with an 800ms debounce). Emails render the body HTML as-is (fine-print styled, just above the footer); the statement PDF converts the body to clean structured plain text (paragraphs, line breaks, bulleted list items; inline bold/italic is not styled in the PDF).
- Statement list sorting & pagination: The admin statements table (`/admin/statements`) now has **sortable columns** (Client, Period, Total Invested, Status, Generated, Approved By) using the same clickable `SortHead` pattern as the distributions table (ArrowUp/ArrowDown/ArrowUpDown indicators; click toggles asc/desc). Sorting is server-side via `sortBy`/`sortDir` on `/api/admin/statements`. The footer has a **"Per page"** dropdown (25 / 50 / 100, default 50, sent as `pageSize`, capped at 100 server-side) plus page X / Y and prev/next controls; changing page size or sort resets to page 1.
- Statement approval email suppression: Approving a statement on `/admin/statements` opens a confirmation modal with a **"Send email notification to client"** toggle. Leaving it on behaves as before (email sent, status → SENT). Turning it off **suppresses the client email** — the statement is still approved and visible in the client portal (status stays APPROVED, and the in-app bell notification still fires), it just isn't emailed. This modal is gated by a **Settings → Statements** toggle ("Confirm before sending statement emails"); when that setting is off, approving is one-click and always emails (original behavior). The feature flag is stored in the `SystemSetting` key/value table (`statement_email_suppression_enabled`, default on) — no schema migration. The single-approve API (`/api/admin/statements/[id]/approve`) accepts `{ sendEmail }`; bulk approve still always emails.
- Statement per-investment activity tables: Renamed and rescoped. The current-period table is **"Current Month Distributions & Credits"** (the statement month's activity). The second table is **"Previous Distributions & Activity"**, showing the **earlier months of the statement's calendar year** — Jan 1 → the start of the statement month (the current month is shown only in the Current Month table, no overlap). Example: a May 2026 statement lists Jan–Apr 2026 here (+ May in the current-month table); a Dec 2025 year-end statement lists Jan–Nov 2025 (+ Dec). Driven by the `ytdStart → periodStart` range on `previousActivity`. Below it are two plain one-liner YTD totals (body font, no highlight): **Total Deposits YTD** (shows "No deposits this year" when zero) and **Total Distributions YTD** — both are true year-to-date (full year through the statement month). Long lists paginate per row and the **column header repeats at the top of each continuation page**.
- Statement summary labels: The first-page summary now labels the blended metrics **"IRR"** and **"APR"** (previously "Net IRR"/"Net APR") — "Net" was redundant since there is no gross IRR/APR.
- Statement all-clients (firm-wide) commentary: A new **"All-Clients Commentary"** section on the Statement Content page (`/admin/statements/content` → Market Commentary tab, top card) lets an admin write **one commentary per month/year that appears on every client's statement**, regardless of which investments they hold — a way to "speak to all clients" at once. It renders at the **top of the Market Commentary page** (above the per-investment commentary blocks), with the entered title or a default "A Note to Our Partners" heading. It's an upsert (one per period): edit the title/body and Save, or Trash to remove; a **LIVE / NOT SET** badge shows whether one exists for the selected period. Backed by the new `StatementGeneralCommentary` model (unique on `month`+`year`), API `/api/admin/statements/general-commentary` (GET/POST/DELETE), fetched in `statement-generator.ts` as `generalCommentary` and rendered in `statement-pdf.ts`. Migration: `20260701120000_add_general_commentary`.
- Statement first-page metrics: The page-1 portfolio summary shows **Portfolio Value, Total Distributions, and Total Return** only. **IRR and APR were removed from the first-page summary** (per request) — the blended `weightedIrr`/`weightedApr` are no longer rendered there. Per-investment IRR/APR still appear on the individual investment pages when those values are set on the position. (The generator still computes `weightedIrr`/`weightedApr`, using independent weights `irrWeight`/`aprWeight`, in case they're needed elsewhere.)
- Statement deep-link admin access: The statement download route (`/api/portal/statements/[id]/download`) now lets **admins open any client's statement** via the email link, in addition to the owning client. Previously it 404'd ("Statement not found") for anyone whose id didn't match the statement owner — so an admin clicking a client's "new statement" email (e.g. while testing) always got the error. Clients still only see their own statement; non-owner non-admins still get a generic 404 (existence not revealed). Requires the statement to have a file and be APPROVED/SENT.
- Statement email/deep-link origin fix: The statement download route (`/api/portal/statements/[id]/download`) builds its login-redirect URL from the **canonical public origin (`NEXTAUTH_URL`)** instead of `request.url`. Behind the Apache reverse proxy the Node server sees the internal host (`localhost:4000`), which previously leaked into the redirect (`https://localhost:4000/login?callbackUrl=...`). Now a logged-out visitor clicking a statement link is sent to `https://<public-domain>/login?callbackUrl=/api/portal/statements/<id>/download` and served the PDF after signing in.
- Statement footer generation timestamp: The footer page line now reads **"Page X of Y | Statement generated on MM/DD/YY at HH:MM:SS ET"** on every page. The timestamp is stamped once at render (Eastern Time) and baked into the stored PDF, so it reflects when the statement was generated.
- Statement glossary: Every statement ends with a **"Glossary of Investment Terms"** section (own page, immediately **before the Disclosures**): plain-language definitions of Portfolio Value, Total Distributions, Total Return, ROI, IRR, and APR, plus a closing note that they're simplified explanations and the offering documents govern. Defined in `GLOSSARY`/`GLOSSARY_NOTE` in `statement-pdf.ts`.
- Statement banner corners: The banner image's **left corners are now rounded** (`borderTopLeftRadius`/`borderBottomLeftRadius: 8` on the `<img>` in `statement-banner.ts`). Satori does not clip an absolutely-positioned child to the parent container's `border-radius`, so the image previously showed square top-left/bottom-left corners while the navy right side was rounded; rounding the image directly matches all four corners.
- Statement banner image fit: The banner image in the **statement PDF** is now **cover-cropped** (aspect ratio preserved), matching the web preview — it was previously stretched (`backgroundSize: "50% 100%"`), which elongated it. Rendered via an absolutely-positioned `<img objectFit:"cover">` in `statement-banner.ts`. **Recommended source image: landscape ~2:1 (e.g. 800×400px)**; it occupies the left ~half of the banner and the center stays in view. A size hint was added to the banner form.
- Statement chart legend/key: Every line-and-bar performance chart in the statement PDF (overall portfolio performance, overall YTD, and each per-investment chart + its YTD) now has a centered **key** below the chart — matching the donut legends' swatch style. It labels the four series: navy **line** = Portfolio Value / Value, gold **line** = Cumulative Distributions, navy **square** = Contributions, gold **square** = Distributions. Rendered by `drawChartLegend()` inside the shared `drawCombinedChartBox`/`drawMiniChartBox` helpers in `statement-pdf.ts`, so it appears on all chart variants automatically.
- Statement YTD charts: Each statement now includes a **Year-to-Date** performance chart directly **below** the existing since-inception chart — both on the first page (overall, "YTD PERFORMANCE") and under each investment. They reuse the exact same renderers/styling as the all-time charts (navy value line, gold distributions line, monthly contribution/distribution bars, buy-in labels), windowed to the current calendar year (Jan 1 → statement month). For the YTD chart the running distributions line **resets to $0 on Jan 1** (true year-to-date), while the value line stays the actual position balance. A compact data strip under each YTD chart shows **YTD Capital Additions** and **YTD Distributions**. Data: `combinedChartDataYTD` + `ytdContributions`/`ytdDistributions` and per-investment `chartDataYTD` in `statement-generator.ts`; rendered via shared `drawCombinedChartBox` / `drawMiniChartBox` / `drawYtdSummaryStrip` helpers in `statement-pdf.ts`. Existing statements must be **regenerated** to pick up the YTD section.
- Statement year picker range: All statement year dropdowns (generate dialog on `/admin/statements`, the per-client Statements tab, and `/admin/statements/content`) now offer years from **2010 through next year**, descending (most recent first), instead of the previous hardcoded `2024–2027`. Driven by `statementYearOptions()` / `STATEMENT_START_YEAR` in `src/lib/utils.ts`; the generate API has no lower-year bound, so historical statements can be created back to 2010.
- Statement list search, default sort & month-display fix: The admin statements table (`/admin/statements`) now **defaults to sorting by the Generated column (newest first)** instead of Period. Above the table is an **AJAX filter bar**: a debounced (300ms) **search box** matching client name, client email, or approver name; an **All months** dropdown; and an **All years** dropdown — all server-side via new `search`/`month`/`year` params on `/api/admin/statements` (results paginate, and any filter change resets to page 1). A **Clear** button appears when any filter is active. Month/year filtering matches `periodStart` using UTC-constructed dates (a month with no year selected matches that month across every selectable year via an exact `in` list). **Bug fix — off-by-one month:** `periodStart` is stored as UTC midnight on the 1st of the month, but the list, PDF filename, and banner-month lookup previously read it with local `.getMonth()`/`.getFullYear()`, which shifted the label back a month (e.g. a December statement showing "November") for readers/servers in timezones behind UTC. All three now use `.getUTCMonth()`/`.getUTCFullYear()`.

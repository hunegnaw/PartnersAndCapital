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
16. [Feature Roadmap](#feature-roadmap)

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

### Logging In

1. Navigate to `/login` in your browser.
2. Enter the admin email and password (see [Default Credentials](#default-credentials) below).
3. If two-factor authentication is enabled on the account, a verification code will be sent to your phone via SMS.
4. After successful login, admins are redirected to the admin panel at `/admin`.

### Admin Layout

The admin panel features a navy sidebar (`#2C3E5C`) matching the client portal, and a dark navy header (`#1A2640`):

**Header:** "PARTNERS + CAPITAL" branding with an "Admin Portal" gold badge, plus links to Audit Log, Settings, and the admin avatar.

**Sidebar sections:** (navy background with white/gold text, same styling as client portal)

- **MANAGE:** Clients (with count), Investments (with count), Documents (with count), Advisors (with count), Activity Feed, Support (with open ticket count)
- **WEBSITE:** Pages (with count), Blog Posts (with count), Blog Categories, Media Library (with count)
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
| `/admin/investments`   | Manage investments, funds, and asset classes          |
| `/admin/documents`     | Upload and manage documents (K-1s, reports, PPMs)    |
| `/admin/activity`      | Manage activity feed posts and deal room updates     |
| `/admin/support`       | View and respond to client support tickets           |
| `/admin/audit-log`     | View audit trail of all system actions                |
| `/admin/api-keys`      | Create and manage API keys for external integrations |
| `/admin/settings`      | Organization settings (branding, colors, 2FA policy) |
| `/admin/clients/[id]`  | Client detail with "View as Client" impersonation    |

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

- **Header:** Sticky dark navy bar with "PARTNERS + CAPITAL" logo (bordered, links to admin dashboard for admins, client dashboard for clients, or home for visitors), database-driven navigation links (configured via page settings), and a gold-outlined "Investor Login" button with LogIn icon. On the homepage, the header starts transparent and transitions to solid on scroll. Navigation links are pulled from CMS pages that have "Show in navigation" enabled, sorted by nav order. Fallback nav shows only "Home" when no pages have navigation enabled.
- **Footer:** Dark navy background with 3-column grid (branding + address, database-driven navigation links + Investor Login, newsletter signup form), copyright line, and legal disclaimer.

### Public Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage -- rendered from CMS page builder (isHomepage flag) |
| `/blog` | Blog listing -- 3-column grid, 9 posts per page, category/tag filters |
| `/blog/[slug]` | Individual blog post with hero image, prose content, related posts |
| `/contact` | Contact page -- rendered from CMS page builder |
| `/[slug]` | Dynamic CMS pages -- any published page by slug |

### Homepage

The root route (`/`) renders the CMS page marked as homepage. If no homepage exists, authenticated users are redirected to their portal (admin, advisor, or client dashboard) and unauthenticated users are redirected to `/login`. Authenticated users see a floating "Go to Portal" button in the bottom-right corner.

---

## Blog System

### Overview

The blog (called "Partner Thoughts" publicly) provides article publishing with categories, tags, rich text editing, and SEO metadata.

### Admin Blog Management

**Post List** (`/admin/blog`): Search, filter by status (published/draft) and category, paginated table with title, category, status, view count, published date, and view (opens in new tab)/edit/delete actions.

**Create/Edit Post** (`/admin/blog/new`, `/admin/blog/[id]/edit`): Two-column editor with:
- **Main area:** Title (auto-generates slug), excerpt, Tiptap rich text editor with full toolbar (bold, italic, underline, strikethrough, headings, lists, alignment, colors, links, images via media picker, blockquotes, code blocks, tables, undo/redo, HTML source toggle)
- **Sidebar:** Publish settings (draft/publish toggle), category dropdown, tag checkboxes, hero image (via media picker), SEO fields (meta title, meta description)

**Categories** (`/admin/blog/categories`): CRUD management with name, slug, color, and sort order.

### Public Blog

**Listing** (`/blog`): Navy hero banner, category filter pills, 3-column responsive post grid with cards showing hero image, category badge, title, excerpt, date, and read time. Tag filter section at bottom. Server-side pagination.

**Post Detail** (`/blog/[slug]`): Hero image or navy fallback, breadcrumb navigation, author/date/read-time/view-count metadata, full prose content, tags, share button (clipboard + native share API), up to 3 related posts. Full SEO metadata via `generateMetadata()`.

### Blog API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/blog` | GET, POST | Admin |
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
| Hero (Video) | Full-viewport video background with overlay text and CTA |
| Hero (Image) | Image background with overlay text and CTA |
| Text Section | Rich HTML content with configurable width, padding, colors |
| Logo Gallery | Grid of logos/images with optional grayscale effect |
| Stats | Number cards row (values + labels) on dark background |
| CTA Banner | Full-width call-to-action with heading, text, and button |
| Two Column | Side-by-side rich text content areas |
| Contact Form | Name/email/message form posting to `/api/contact` |
| Newsletter Signup | Email signup form posting to `/api/newsletter` |
| Quote | Blockquote with attribution and role |
| Image | Single image with alt text and caption |
| Video Embed | YouTube/Vimeo responsive iframe |
| Spacer | Vertical spacing (sm/md/lg/xl) |

### Admin Page Editor

**Page List** (`/admin/pages`): Table showing title, slug, status (Draft/Published/Archived), homepage indicator, nav indicator, blog indicator, block count, last updated, and view (opens in new tab)/edit/delete actions.

**Create/Edit Page** (`/admin/pages/new`, `/admin/pages/[id]/edit`): Two-column layout with:
- **Main area:** Title, slug, and block editor with drag-and-drop reordering (@dnd-kit). Add blocks via a picker dialog showing all 13 block types. Each block expands/collapses to show its editor form.
- **Sidebar:** Status dropdown, homepage checkbox, blog page checkbox, navigation settings, SEO fields, save button.

Pages are saved atomically: page metadata and all blocks are updated in a single database transaction.

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

### Page API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/pages` | GET, POST | Admin |
| `/api/admin/pages/[id]` | GET, PATCH, DELETE | Admin |

---

## Media Library

### Overview

The media library manages public images and videos used across blog posts and CMS pages. Files are stored unencrypted in `public/uploads/media/YYYY/` and served directly by Next.js.

### Admin Media Browser (`/admin/media`)

- **Upload:** Drag-and-drop or file picker. Images up to 10MB, videos up to 100MB.
- **Browse:** Grid of thumbnails with search and type filter (Images/Videos/All). Paginated.
- **Edit:** Click any media item to update alt text and caption.
- **Delete:** Soft delete (sets deletedAt, removes file from disk).
- **Supported formats:** JPEG, PNG, GIF, WebP, SVG (images); MP4, WebM, MOV (videos).

### Media Picker Component

A reusable dialog component (`MediaPicker`) that can be opened from any admin form. Provides browse and upload tabs, returns the selected media object. Used in the blog post editor, page block editor, and anywhere images/videos are needed.

### Media API Routes

| Route | Methods | Auth |
|-------|---------|------|
| `/api/admin/media` | GET, POST | Admin |
| `/api/admin/media/[id]` | GET, PATCH, DELETE | Admin |

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

### Distributions

The distributions page at `/capital-activity` shows contribution and distribution history for each investment position.

### Settings

The settings page at `/settings` allows users to update their profile information and manage two-factor authentication.

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
- **Access level** (4 tiers):
  1. **Dashboard only** -- Portfolio summary, allocation, and performance numbers. No documents.
  2. **Dashboard + Tax documents** -- Includes K-1s and 1099s. No legal agreements or reports. Best for CPAs.
  3. **Dashboard + All documents** -- Full document vault access. Recommended for financial advisors and family offices.
  4. **Specific investment only** -- Restrict to one deal. Useful for deal-specific attorneys or co-investors.
- **Access start date** (defaults to today)
- **Expiration date** (when access automatically expires)

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

- **Optional** (default) -- Users can choose whether to enable 2FA on their account.
- **Mandatory** -- All users must set up 2FA before they can access the portal. Users who have not configured 2FA will be prompted to do so on login.
- **Disabled** -- 2FA is turned off across the platform.

### Setting Up 2FA (User Flow)

1. Navigate to `/settings` (or `/admin/settings` for admins).
2. Find the "Two-Factor Authentication" section.
3. Click "Set up two-factor authentication."
4. Enter your phone number (with country code, e.g., +1 for US/Canada).
5. A 6-digit verification code will be sent via SMS. Enter the code to verify.
6. Save your backup codes in a safe place (10 one-time codes for emergency access).
7. 2FA is now active on your account. A code will be sent to your phone on each login.

### Login with 2FA

1. Enter email and password as normal.
2. A verification code is automatically sent to your phone via SMS.
3. Enter the 6-digit code to complete login.
4. Alternatively, use a backup code if you cannot access your phone.

### Disabling 2FA

1. Navigate to `/settings` and click "Disable 2FA."
2. A verification code will be sent to your phone for confirmation.
3. Enter the code to disable 2FA.

### Technical Details

- TOTP secrets are stored in the `TwoFactorSecret` table (used server-side to generate time-based codes).
- The `twoFactorEnabled` flag on the User model tracks whether 2FA is active.
- SMS is sent via Twilio. When `TWILIO_ACCOUNT_SID` is not set, codes are logged to the console (development/stub mode).
- TOTP generation and verification is handled by the `otpauth` library.
- Backup codes are hashed with bcrypt and stored in the `BackupCode` table.

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

| Level | Dashboard | Tax Docs (K-1, 1099) | All Documents | Investments |
|-------|-----------|---------------------|---------------|-------------|
| DASHBOARD_ONLY | Yes | No | No | All |
| DASHBOARD_AND_TAX_DOCUMENTS | Yes | Yes | No | All |
| DASHBOARD_AND_DOCUMENTS | Yes | Yes | Yes | All |
| SPECIFIC_INVESTMENT | Yes | Per permission | Per permission | Specified only |

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
| **Welcome Email** | New client account created | Client |

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
- `supportTicketSchema` -- subject (max 200), message (max 5000), category enum
- `advisorInviteSchema` -- name, email, permission level enum, optional dates
- `profileUpdateSchema` -- name, phone, company (all optional, with max lengths)
- `ticketReplySchema` -- message (max 5000)

---

## Google Analytics 4

GA4 integration is available via the `NEXT_PUBLIC_GA4_ID` environment variable. When set, the GA4 script tag is automatically included in the root layout.

### Configuration

```
NEXT_PUBLIC_GA4_ID="G-XXXXXXXXXX"
```

When the environment variable is not set (e.g., in development), the component renders nothing.

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
- Advisor access with 4-tier permission levels and access logging
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
- Page builder with 13 drag-and-drop block types and live preview
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

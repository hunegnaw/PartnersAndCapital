# Monthly Client Statements — Implementation Plan

## Overview

Automated monthly statement system that generates branded PDF statements for each client, with dynamic banners, investment data, performance charts, and a compliance-focused approval workflow. Statements are encrypted and stored on the VPS, surfaced in the client portal Statements tab, with email notifications.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN PORTAL                                                    │
│  ├── /admin/statements           → Queue + approval workflow    │
│  ├── /admin/statements/banners   → Banner library + builder     │
│  ├── /admin/settings (accordion) → Statement disclosures        │
│  └── /admin/clients/[id] (tab)   → Manual generate + history    │
├─────────────────────────────────────────────────────────────────┤
│ BACKEND SERVICES                                                │
│  ├── Statement Generator         → Collects data per client     │
│  ├── Chart Renderer              → Server-side SVG via Recharts │
│  ├── PDF Renderer                → Puppeteer HTML→PDF           │
│  ├── Encryption                  → AES-256-GCM (same as docs)  │
│  ├── Scheduler                   → node-cron on 2nd biz day    │
│  └── Holiday API                 → US bank holidays check       │
├─────────────────────────────────────────────────────────────────┤
│ CLIENT PORTAL                                                   │
│  └── /documents (Statements tab) → View/download approved PDFs  │
├─────────────────────────────────────────────────────────────────┤
│ EMAIL                                                           │
│  ├── Admin: "X statements generated, pending approval"          │
│  └── Client: "Your [Month] statement is ready" + CTA button    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema

### New Models

```prisma
model Statement {
  id              String          @id @default(cuid())
  userId          String          // The client
  periodStart     DateTime        // First day of month (e.g. 2026-04-01)
  periodEnd       DateTime        // Last day/current date (e.g. 2026-04-30)
  statementDate   String          // Display date (e.g. "4/30/2026")
  status          StatementStatus @default(GENERATED)
  filePath        String?         // Encrypted PDF path on disk
  fileName        String?         // Display filename (e.g. "Statement-April-2026.pdf")
  fileSize        Int?
  generatedAt     DateTime        @default(now())
  approvedAt      DateTime?
  approvedBy      String?         // Admin who approved
  sentAt          DateTime?       // When email was sent
  totalInvested   Decimal         @db.Decimal(14, 2)
  currentValue    Decimal         @db.Decimal(14, 2)
  totalDistributions Decimal      @db.Decimal(14, 2)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  deletedAt       DateTime?

  user            User            @relation(fields: [userId], references: [id])
  approver        User?           @relation("StatementApprover", fields: [approvedBy], references: [id])
  banners         StatementBannerPlacement[]

  @@unique([userId, periodStart]) // One statement per client per month
  @@index([status, periodStart])
  @@index([userId, periodStart, deletedAt])
}

enum StatementStatus {
  GENERATED       // PDF created, pending admin review
  APPROVED        // Admin approved, email sent, visible in portal
  REJECTED        // Admin rejected (needs regeneration)
  SENDING         // Email in progress
  SENT            // Email delivered
}

model StatementBanner {
  id              String    @id @default(cuid())
  title           String    // Banner headline
  description     String?   @db.Text  // Banner body text
  imageUrl        String?   // Left-side image (uploaded to media)
  buttonText      String?   // CTA button text (e.g. "Learn More")
  buttonUrl       String?   // CTA link (any URL)
  gradientFrom    String    @default("#1A2640")  // Gradient start (behind image)
  gradientTo      String    @default("#1A2640")  // Gradient end (text background)
  isArchived      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  assignments     StatementBannerAssignment[]
  placements      StatementBannerPlacement[]
}

// Pre-assignment: "this banner should appear on these clients' statements for these months"
model StatementBannerAssignment {
  id              String    @id @default(cuid())
  bannerId        String
  userId          String?   // null = all clients
  month           Int       // 1-12
  year            Int       // e.g. 2026
  createdAt       DateTime  @default(now())

  banner          StatementBanner @relation(fields: [bannerId], references: [id], onDelete: Cascade)
  user            User?     @relation(fields: [userId], references: [id])

  @@unique([bannerId, userId, month, year])
  @@index([month, year])
}

// Actual placement: "this banner WAS on this statement" (historical record)
model StatementBannerPlacement {
  id              String    @id @default(cuid())
  statementId     String
  bannerId        String
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())

  statement       Statement       @relation(fields: [statementId], references: [id], onDelete: Cascade)
  banner          StatementBanner @relation(fields: [bannerId], references: [id])

  @@unique([statementId, bannerId])
}

// Editable disclosures for statement footer
model StatementDisclosure {
  id              String    @id @default(cuid())
  title           String    // e.g. "Confidential / Informational Only."
  body            String    @db.Text
  sortOrder       Int       @default(0)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### User Model Additions

Add to User model:
```prisma
statements        Statement[]
statementApprovals Statement[] @relation("StatementApprover")
bannerAssignments StatementBannerAssignment[]
```

---

## Phase 2: PDF Generation Engine

### Dependencies
- `puppeteer` — headless Chrome for HTML→PDF (pixel-perfect)
- `node-cron` — in-process scheduler (works with PM2)

### Statement Data Collector (`src/lib/statement-generator.ts`)

For a given client + period:
1. Fetch client profile (name, email) + organization settings (logo, contact info, legal name)
2. Fetch all active ClientInvestments (with Investment + AssetClass)
3. For each investment, fetch:
   - Contributions in the statement period (RECENT)
   - Contributions in the 3 months before the period (PREVIOUS)
   - Distributions in the statement period (RECENT)
   - Distributions in the 3 months before the period (PREVIOUS)
   - Current amountInvested, currentValue, returnPercentage, irr, adminApr, cashDistributed
4. Calculate portfolio-wide ROI, IRR, APR (weighted averages)
5. Generate chart data (same algorithm as dashboard API)
6. Fetch assigned banners for this client + month/year
7. Fetch active disclosures
8. Return structured StatementData object

### Chart Renderer (`src/lib/statement-chart.ts`)

Server-side rendering of Recharts to SVG:
- Use `recharts` + `ReactDOMServer.renderToStaticMarkup()` 
- Render ComposedChart matching the dashboard style (navy/gold bars + lines)
- Combined chart: portfolio value + cumulative distributions (same as dashboard)
- Per-investment mini charts: just that investment's cumulative invested + distributions
- Output as SVG string embedded in the HTML template

### HTML Template (`src/lib/statement-template.ts`)

Full HTML page matching the screenshot design:
- Navy header with logo + "PUBLIC ACCESS TO PRIVATE MARKETS" + "STATEMENT" + date
- Gold divider line
- Client name + Total Amount Invested
- Banner(s) — image left, gradient overlay, title/description/CTA stacked right
- Combined performance chart (all investments)
- For each investment:
  - Investment name + amount invested + ROI/IRR/APR row
  - Mini performance chart
  - RECENT PAYMENTS & CREDITS table (current month contribs + distros)
  - PREVIOUS PAYMENTS & ACTIVITY table (prior 3 months)
  - TOTAL YTD summary
- Disclosures section
- Footer with org legal name + email + address

### PDF Renderer (`src/lib/statement-pdf.ts`)

```typescript
async function generateStatementPDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser.close();
  return Buffer.from(pdf);
}
```

PDF is then encrypted with AES-256-GCM using the existing `upload.ts` pattern and saved to `uploads/statements/YYYY/uuid.enc`.

---

## Phase 3: Admin — Statement Queue & Approval

### Admin Page: `/admin/statements`

**Toolbar:**
- Filters: Status (All/Generated/Approved/Sent/Rejected), Month/Year picker, Client search
- "Generate Statements" button → modal: select month/year, option for "all clients" or specific clients, confirm
- Count badges: Pending (X), Approved (X), Sent (X)

**Table Columns:**
- Checkbox (bulk select)
- Client Name
- Statement Period (e.g. "April 2026")
- Total Invested
- Status badge (color-coded)
- Generated At
- Approved By
- Sent At
- Actions: Preview (eye icon opens PDF in new tab), Approve, Reject, Regenerate

**Bulk Actions:**
- "Approve Selected" — marks as APPROVED, sends emails, makes visible in portal
- "Reject Selected" — marks as REJECTED (admin can add a note)
- "Regenerate Selected" — re-runs PDF generation for selected statements

**Preview:**
- Opens decrypted PDF in a new browser tab (same pattern as document download)
- Admin MUST preview before approving (compliance mindset)

### API Routes

- `GET /api/admin/statements` — list with filters, pagination
- `POST /api/admin/statements/generate` — trigger generation for month/year + client selection
- `PATCH /api/admin/statements/[id]/approve` — approve + send email
- `PATCH /api/admin/statements/[id]/reject` — reject with optional reason
- `POST /api/admin/statements/[id]/regenerate` — regenerate PDF
- `POST /api/admin/statements/bulk-approve` — bulk approve
- `POST /api/admin/statements/bulk-reject` — bulk reject
- `GET /api/admin/statements/[id]/preview` — decrypt + serve PDF

All actions create AuditLog entries.

---

## Phase 4: Admin — Banner Builder & Library

### Admin Page: `/admin/statements/banners`

**Banner Library Tab:**
- Grid view of all banners (card with thumbnail preview)
- Search/filter: Active, Archived
- "Create Banner" button → opens builder dialog

**Banner Builder Dialog (full-screen modal):**
- Left panel: Live preview (WYSIWYG) showing how the banner will look on the statement
- Right panel: Settings
  - Image upload (uses existing Media Library picker) — image placed on left side
  - Gradient colors (from/to) — defaults to navy
  - Title (text input)
  - Description (textarea)
  - Button text (default "Learn More")
  - Button URL (any URL)
- Save to library

**Used Banners Tab:**
- Table: Banner title, thumbnail, assigned clients (count + names on hover), assigned months/years, status (scheduled/sent)
- Click to see full detail of who received it and when

### Banner Assignment Flow
1. Admin clicks "Assign" on a banner in the library
2. Modal opens with:
   - Month/Year multi-select (can pick multiple months, e.g. "June 2026, July 2026")
   - Client selection: "All Clients" toggle or individual checkboxes with search
3. Save creates `StatementBannerAssignment` records
4. When statements generate, they check assignments and create `StatementBannerPlacement` records

### API Routes

- `GET /api/admin/statements/banners` — list all banners
- `POST /api/admin/statements/banners` — create banner
- `PATCH /api/admin/statements/banners/[id]` — update banner
- `DELETE /api/admin/statements/banners/[id]` — soft delete (archive)
- `POST /api/admin/statements/banners/[id]/assign` — assign to clients + months
- `GET /api/admin/statements/banners/[id]/assignments` — get assignment details

---

## Phase 5: Admin — Statement Disclosures (Settings Accordion)

### Settings Page Changes

Convert ALL existing settings sections (Branding, Typography, Contact, Compliance, Security, Avatar) from `Card` to `Accordion` items. Add a new "Statement Disclosures" accordion section.

**Statement Disclosures Section:**
- List of disclosure items with drag-to-reorder (sortOrder)
- Each item: Title (bold) + Body (textarea)
- "Add Disclosure" button
- Toggle active/inactive per disclosure
- Delete disclosure
- Pre-seeded with the 6 disclosures from the screenshot:
  1. Confidential / Informational Only
  2. Illiquidity / Realization Risk
  3. Performance Disclosure
  4. Fees and Expenses
  5. Tax / Legal Disclaimer
  6. Report Discrepancies Promptly

### API Routes

- `GET /api/admin/statements/disclosures` — list all disclosures
- `POST /api/admin/statements/disclosures` — create
- `PATCH /api/admin/statements/disclosures/[id]` — update
- `DELETE /api/admin/statements/disclosures/[id]` — delete
- `PATCH /api/admin/statements/disclosures/reorder` — bulk update sortOrder

---

## Phase 6: Manual Statement Generation (Client Detail Page)

### Changes to `/admin/clients/[id]`

Add a new **"Statements"** tab alongside Investments, Documents, Advisors.

**Statements Tab:**
- Table of all statements for this client (period, status, generated/approved/sent dates)
- "Generate Statement" button → modal:
  - Month/Year selector (defaults to current month)
  - "Month-to-date" toggle (when generating mid-month, uses today's date as periodEnd)
  - If statement already exists for that period, warn: "A statement already exists. Regenerate?"
  - Confirm → generates + shows in queue as GENERATED (requires approval)
- "Batch Generate" option: select multiple months to generate at once
- Preview button per statement (opens PDF in new tab)

All actions logged to AuditLog.

---

## Phase 7: Scheduling & Holiday Logic

### Holiday API

Use the free Nager.Date API (https://date.nager.at) — no API key required:
- `GET /api/v3/PublicHolidays/{year}/US` → returns all US public holidays
- Cache results in `SystemSetting` table (keyed by year) to avoid redundant calls
- Bank holidays = US federal holidays (New Year's, MLK, Presidents' Day, Memorial Day, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas)

### Business Day Calculator (`src/lib/business-days.ts`)

```typescript
async function getNextBusinessDay(targetDate: Date): Promise<Date> {
  // If target is weekend or holiday, push to next business day
  const holidays = await getUSHolidays(targetDate.getFullYear());
  let date = new Date(targetDate);
  while (isWeekend(date) || isHoliday(date, holidays)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}
```

### Cron Job (`src/lib/statement-scheduler.ts`)

Using `node-cron` running inside the Next.js process (persists via PM2):

```typescript
// Run at 6:00 AM on the 1st, 2nd, and 3rd of every month
// (covers all possible business-day offsets from the 2nd)
cron.schedule('0 6 1,2,3 * *', async () => {
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const targetDate = new Date(today.getFullYear(), today.getMonth(), 2); // 2nd of month
  const businessDay = await getNextBusinessDay(targetDate);

  if (isSameDay(today, businessDay)) {
    await generateMonthlyStatements(previousMonth);
    await notifyAdminsOfPendingStatements();
  }
});
```

Register the cron in `src/lib/init-scheduler.ts`, imported from the app layout or a custom server file.

---

## Phase 8: Email Notifications

### New Email Templates

**1. `statementReadyEmail` (to client)**
```
Subject: Your [Month Year] Statement is Ready

Hello [Name],

Your investment statement for [Month Year] is now available in your portal.

[View Statement] ← CTA button

If you have questions about your statement, please contact us at
[org.email] or [org.phone].
```

**2. `statementsGeneratedEmail` (to admins)**
```
Subject: [X] Client Statements Generated — Pending Approval

[X] client statements for [Month Year] have been generated and are
ready for your review.

[Review Statements] ← CTA button linking to /admin/statements?status=GENERATED&period=YYYY-MM
```

Both use the existing `emailWrapper` + `emailButton` pattern.

---

## Phase 9: Client Portal — Statements Tab

### Changes to `/documents` page (Statements tab)

Currently shows uploaded STATEMENT documents. Update to ALSO show approved Statement records:
- Merge DB Statement records (status = APPROVED or SENT) with manually uploaded STATEMENT docs
- Sort by date descending
- Statement rows show: "Statement — [Month Year]", date, download icon
- Click to download decrypted PDF (same pattern as document download)
- Year filter applies to both

### API Route

- `GET /api/portal/statements` — list approved statements for current user
- `GET /api/portal/statements/[id]/download` — decrypt + serve PDF

---

## Phase 10: Sidebar Navigation

Add "Statements" to the MANAGE section in `sidebar-nav.tsx`:

```typescript
const manageNav: NavItem[] = [
  // ... existing items ...
  { href: "/admin/statements", label: "Statements", countKey: "statementCount" },
]
```

`statementCount` = count of GENERATED (pending approval) statements.

Add sub-navigation within the statements page for: Queue | Banners

---

## Implementation Order

Given the complexity and compliance focus, build in this order:

1. **Schema + migrations** — all new models
2. **Statement data collector** — the data assembly logic (testable independently)
3. **Chart renderer** — server-side SVG generation
4. **HTML template** — matching the screenshot pixel-for-pixel
5. **PDF renderer** — Puppeteer integration + encryption
6. **Admin queue page** — generate + preview + approve/reject
7. **Email notifications** — both admin and client templates
8. **Client portal** — show approved statements in Statements tab
9. **Banner builder** — library + assignment
10. **Disclosures** — settings accordion + seed data
11. **Client detail page** — manual generate + statement history tab
12. **Scheduler** — cron + holiday API
13. **Settings accordion refactor** — convert cards to accordions

---

## File Inventory (New Files)

```
prisma/schema.prisma                          — 5 new models
prisma/seed-disclosures.ts                    — Seed default disclosures

src/lib/statement-generator.ts                — Data collection per client
src/lib/statement-template.ts                 — HTML template builder
src/lib/statement-chart.ts                    — Server-side chart rendering
src/lib/statement-pdf.ts                      — Puppeteer PDF generation
src/lib/business-days.ts                      — Holiday API + business day calc
src/lib/statement-scheduler.ts                — node-cron monthly trigger

src/app/api/admin/statements/route.ts         — List + generate
src/app/api/admin/statements/generate/route.ts — Trigger generation
src/app/api/admin/statements/[id]/route.ts    — Single statement ops
src/app/api/admin/statements/[id]/preview/route.ts — Serve decrypted PDF
src/app/api/admin/statements/[id]/approve/route.ts
src/app/api/admin/statements/[id]/reject/route.ts
src/app/api/admin/statements/[id]/regenerate/route.ts
src/app/api/admin/statements/bulk-approve/route.ts
src/app/api/admin/statements/bulk-reject/route.ts
src/app/api/admin/statements/banners/route.ts
src/app/api/admin/statements/banners/[id]/route.ts
src/app/api/admin/statements/banners/[id]/assign/route.ts
src/app/api/admin/statements/banners/[id]/assignments/route.ts
src/app/api/admin/statements/disclosures/route.ts
src/app/api/admin/statements/disclosures/[id]/route.ts
src/app/api/admin/statements/disclosures/reorder/route.ts

src/app/api/portal/statements/route.ts        — Client: list approved statements
src/app/api/portal/statements/[id]/download/route.ts — Client: download PDF

src/app/(admin)/admin/statements/page.tsx      — Queue + approval UI
src/app/(admin)/admin/statements/banners/page.tsx — Banner library + builder

src/lib/email-templates.ts                     — 2 new templates (modified)
src/components/admin/sidebar-nav.tsx           — Add Statements nav (modified)
src/app/(admin)/admin/settings/page.tsx        — Convert to accordions (modified)
src/app/(admin)/admin/clients/[id]/page.tsx    — Add Statements tab (modified)
src/app/(portal)/documents/page.tsx            — Merge statement records (modified)
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Puppeteer binary size (~300MB) on VPS | Install once, reuse. Works fine on Cloudways VPS with PM2 |
| Chart rendering fails server-side | Fallback to no-chart PDF if SVG generation throws |
| Holiday API down | Cache holidays yearly in DB; hardcode current year as fallback |
| PDF generation slow for many clients | Generate sequentially with progress tracking; admin gets email when done |
| Statement data discrepancy | Approval queue is the compliance safety net — admin previews every statement |
| Puppeteer memory on batch generation | Process one client at a time, close browser between each |

---

## Estimated Effort

- Phase 1 (Schema): ~30 min
- Phase 2 (PDF Engine): ~3 hours
- Phase 3 (Admin Queue): ~2 hours
- Phase 4 (Banner Builder): ~2 hours
- Phase 5 (Disclosures): ~1 hour
- Phase 6 (Client Detail): ~1 hour
- Phase 7 (Scheduler): ~1 hour
- Phase 8 (Email): ~30 min
- Phase 9 (Portal): ~30 min
- Phase 10 (Nav): ~15 min

**Total: ~12 hours**

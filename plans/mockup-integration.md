# Mockup Integration — Align All Pages with Design Screenshots

## Context

Phase 2 built functional admin CRUD, client portal, documents, advisor sharing, and 2FA. All pages work but don't match the design mockups the user provided. This plan details every change needed to make the UI match the 5 design screenshots pixel-by-pixel.

The screenshots are:
1. **Client Dashboard (full)** — David Morgan's dashboard with investments
2. **Admin Dashboard** — Client Management view with stats, search, tabs, table
3. **Client Documents** — Category sidebar, CPA banner with expiration, grouped documents
4. **Advisor Access** — 4-tier access levels, access tags, access log
5. **Empty Client Dashboard** — James Whitfield's onboarding state
6. **Investment Detail** — Permian Basin Fund I with two-column layout

---

## Step 1: Schema Migration

**File:** `prisma/schema.prisma`

Add `DASHBOARD_AND_TAX_DOCUMENTS` to the `AdvisorPermissionLevel` enum (between `DASHBOARD_ONLY` and `DASHBOARD_AND_DOCUMENTS`):
```
enum AdvisorPermissionLevel {
  DASHBOARD_ONLY
  DASHBOARD_AND_TAX_DOCUMENTS   // NEW — K-1s and 1099s only
  DASHBOARD_AND_DOCUMENTS
  SPECIFIC_INVESTMENT
}
```

Add `accessStartAt` to `AdvisorAccess`:
```
accessStartAt DateTime? // NEW — when access begins
```

**Run:** `npx prisma migrate dev --name add-tax-doc-permission-and-access-start`

---

## Step 2: Portal Layout Overhaul

**File:** `src/app/(portal)/layout.tsx`

Current: Dark navy header + dark navy sidebar, flat nav list, icons on each item
Mockup: Light sidebar with warm cream background, section headers, bullet dots, top nav bar

**Changes:**
- **Header:** Keep navy `#0f1c2e`. Left: "PARTNERS + CAPITAL" in bold uppercase. Right: top nav links (Documents, Advisor Access, Notifications, avatar circle with initials). Drop the logout icon from header.
- **Sidebar:** Change from dark navy to light/white. Add section headers "INVESTOR" and "ACCOUNT". Items: bullet dot (gold when active) + label, no icons. Nav items:
  - INVESTOR: Dashboard, Portfolio, Documents, Distributions, Advisor Access
  - ACCOUNT: Settings, Support, Log Out
- **Active state:** Gold/amber left border, gold text color on active item
- **Background:** Change main content area from `bg-gray-50` to warm cream `bg-[#faf8f5]`
- **Notification bell:** Import `NotificationBell` component into header nav

---

## Step 3: Admin Layout Overhaul

**File:** `src/app/(admin)/admin/layout.tsx`

Current: "Portal" link + shield "Admin Panel", flat nav list
Mockup: "PARTNERS + CAPITAL" left, "Admin Portal" gold pill badge, grouped sidebar

**Changes:**
- **Header:** Left: "PARTNERS + CAPITAL" bold uppercase + "Admin Portal" gold pill badge. Right: "Audit Log" link, "Settings" link, avatar circle.
- **Sidebar:** Light background (same as portal). Grouped sections:
  - MANAGE: Clients (count), Investments (count), Documents (count), Advisors (count), Activity Feed
  - SYSTEM: Admin Users, Audit Log, Settings
- **Active state:** Same gold left border + gold text as portal
- **Warm cream background** on main content area

---

## Step 4: Client Dashboard — Full State

**File:** `src/app/(portal)/dashboard/page.tsx`

**API changes needed:** `src/app/api/portal/dashboard/route.ts`
- Add `totalReturn` (percentage) and `netIRR` to KPI response
- Include `amountInvested` in `recentInvestments` data
- Add `cashDistributed` to KPI data (already exists as `totalDistributions`)
- Return `lastUpdated` timestamp

**UI changes (full state):**
- Welcome text: "Welcome back, {firstName}." + "Here's where your capital stands." subtitle + "Updated {date}" right-aligned
- **4 KPI cards** with new labels/subtitles:
  1. "Total Invested" / subtitle: "{N} investments"
  2. "Current Value" / subtitle: "+${gain}" (green)
  3. "Total Return" / subtitle: "Net IRR"
  4. "Cash Distributed" / subtitle: "YTD"
- **ALLOCATION** section: uppercase "ALLOCATION" heading, horizontal bars with specific colors (Oil & Gas = amber `#b8860b`, Real Estate = navy `#1e3a5f`, Private Credit = dark gray `#4a5568`, Specialty = light gray `#a0aec0`). Show percentage value on right. No dollar amounts.
- **PORTFOLIO GROWTH** section: uppercase heading, gold/amber line color on chart
- **ACTIVE INVESTMENTS** table: uppercase "ACTIVE INVESTMENTS" heading. Columns: DEAL, INVESTED, RETURN, STATUS. Show formatted amounts ($250K not $250,000). Status badges: Active (green outline), Performing (blue).
- **DOCUMENTS** section: Card list with title, type · investment below, "Download" text link (not icon button)
- **RECENT ACTIVITY** section: Amber bullet dots, event text, month + year date below each

---

## Step 5: Client Dashboard — Empty State

**File:** `src/app/(portal)/dashboard/page.tsx` (EmptyDashboard component)

**Complete rewrite of empty state to match mockup:**
- **Navy hero banner** (full width, rounded): "Welcome to your portal" small pill badge on top, "Good to have you, {name}." large heading, descriptive paragraph, "Contact your advisor" link, large avatar circle with initials on right side
- **Getting Started** — 3 cards (not 4):
  1. "Portal access" — green border, checkmark icon, "Your account is active and secure.", "Complete" green text
  2. "First investment confirmed" — numbered step 2, "Once your subscription is processed, your dashboard will populate.", "Questions? Contact us →" link
  3. "Invite your advisor" — numbered step 3, "Give your CPA or financial advisor read-only access when you're ready.", "Set up access →" link
- **Empty sections** — two cards side by side with dashed borders:
  - PORTFOLIO: "Pending first investment" subtitle, "No investments yet" + description
  - DOCUMENTS: "Nothing uploaded yet" subtitle, "No documents yet" + description

---

## Step 6: Documents Page

**File:** `src/app/(portal)/documents/page.tsx`

**Changes:**
- **Subtitle:** "Everything you need. Nothing buried."
- **CPA access banner** (new): If user has any active advisors with tax/document access, show banner: "{Name} (CPA) has access to tax documents" + "View + Download · Expires {date}" + "Manage access" link to advisors page. Fetch advisor data from API.
- **Left sidebar restructure:** Two sections:
  - "CATEGORIES" — All Documents, Tax Documents, Quarterly Reports, Legal & Agreements, Capital Notices (with counts)
  - "BY INVESTMENT" — List each investment name with document count
- **Category grouping:** Instead of flat list, group documents under category headers: "TAX DOCUMENTS", "QUARTERLY REPORTS", "LEGAL & AGREEMENTS", "CAPITAL NOTICES"
- **Document card redesign:**
  - File type icon badge: PDF (red/salmon bg), DOC (blue bg) — derived from mimeType
  - Title in bold
  - Metadata line: "Uploaded {date} · {fileSize}"
  - "Visible to CPA" text indicator (if advisorVisible)
  - Tags: document type tag (K-1, Report, Legal) + "New" tag if uploaded within last 7 days
  - "Download" button (outlined)
- **3 filter dropdowns** (not inline with search): All years, All types, All investments — each full width stacked

---

## Step 7: Advisor Access Page

**File:** `src/app/(portal)/advisors/page.tsx`

**Changes:**

**Left column — Invite form:**
- Title: "Invite an Advisor" (no card wrapper, no icon)
- Subtitle: "Share visibility with your CPA, financial advisor, or family office rep. You control what they see and for how long."
- Fields order: Advisor name, Email address, Advisor type (dropdown with "CPA / Tax Advisor" label), Access level (4 radio options), Access start date, Expiration date, Send Invitation button, disclaimer text
- **4 access levels** (currently 3):
  1. "Dashboard only" — "Portfolio summary, allocation, and performance numbers. No documents."
  2. "Dashboard + Tax documents" — "Best for CPAs. Includes K-1s and 1099s. No legal agreements or reports." (NEW)
  3. "Dashboard + All documents" — "Full document vault access. Recommended for financial advisors and family offices."
  4. "Specific investment only" — "Restrict to one deal. Useful for deal-specific attorneys or co-investors."
- **Access start** date picker (default today)
- Disclaimer: "Advisor will receive a secure link via email. You can revoke access at any time."

**Right column — Active Advisors:**
- Title: "Active Advisors" + "{N} advisors currently have access to your portfolio."
- **Advisor cards redesign:**
  - Avatar (2-letter initials, colored background), Name bold, "Type · Firm" subtitle, email below
  - Status badge: "Active" (green) or "Invite pending" (yellow/amber)
  - **Access tags** — derived from permission level: "Dashboard", "K-1s", "1099s", "Reports", "Legal docs", "All documents" — shown as bordered tag pills
  - Date line: "Expires {date} · Last viewed {date}" OR "Invited {date} · Not yet accepted"
  - Actions: "Edit" + "Revoke" (red) for active, "Resend" + "Cancel" (red) for pending

**ACCESS LOG section (new):**
- Below active advisors
- Table: date/time, event description
- Fetch from audit log filtered to advisor-related actions for this client

**API changes needed:** `src/app/api/portal/advisors/route.ts`
- POST: Accept `accessStartAt` field, pass to AdvisorAccess creation
- GET: Include `lastViewedAt` from audit log (most recent advisor action)

---

## Step 8: Investment Detail Page

**File:** `src/app/(portal)/investments/[id]/page.tsx`

**Changes:**

**Header area** (navy background section):
- Breadcrumb: "Portfolio / {name}"
- Title: large bold
- Subtitle: "{assetClass} · {location}" (e.g., "Oil & Gas · West Texas")
- "Active" badge on the right (green outline)

**Tab navigation:**
- Overview (default), Updates, Documents, Disclosures (rename "Capital Activity" → "Disclosures")

**5 KPI cards** with subtitles matching mockup:
1. INVESTED: ${amount} / "{date}" subtitle
2. CURRENT VALUE: ${amount} / "+${gain}" subtitle (green)
3. TOTAL RETURN: +{%} / "Net IRR" subtitle
4. CASH DISTRIBUTED: ${amount} / "{N} payments" subtitle
5. HOLDING PERIOD: {N} mo. / "Target {M} mo." subtitle (NEW — calculated from investmentDate and targetHoldPeriod)

**Overview tab — two-column layout:**
- **Left column:**
  - OVERVIEW section header
  - Description paragraph
  - Metadata table: Asset class, Location, Investment date, Target hold, Target return, Distribution cadence, Fund status
- **Right column:**
  - VALUE OVER TIME line chart (amber line)
  - LATEST UPDATE card (highlighted, showing most recent DealRoomUpdate)

**ALL UPDATES section (below two columns):**
- Date header groups (April 2026, January 2026, etc.)
- Update title bold, description text below

**DOCUMENTS section (below updates):**
- Document list with: title, "Type · Date", Download link

**Disclaimer box at bottom:**
- "Past performance is not indicative of future results. Private investments carry risk including loss of principal. Return figures are estimates and subject to final fund accounting."

**API changes needed:** `src/app/api/portal/investments/[id]/route.ts`
- Return distribution count for the "N payments" subtitle
- Return total gain (currentValue - amountInvested)
- Return growth data for VALUE OVER TIME chart

---

## Step 9: Admin Dashboard (Client Management)

**File:** `src/app/(admin)/admin/page.tsx`

The admin dashboard mockup shows the Client Management page as the default admin view. The current admin dashboard shows stats + quick actions. Looking at the mockup more carefully, it has "Client Management" as the title with stats above the client table.

**Changes:**
- Title: "Client Management" + "Add, update, and manage investor profiles. Records are archived, not deleted."
- **3 stat cards:** Total Clients (+ subtitle "+{N} this month"), Active Portals ({N} / subtitle "{M} pending setup"), AUM (Total) ($47.2M / subtitle "Across {N} deals")
- **Audit status bar:** Green dot + "Audit log active — all changes tracked. Last action: {description} · {time ago} by {admin}"
- **Search + filters:** Search clients text input, "All statuses" dropdown, "All roles" dropdown, "Export CSV" button
- **Tabs:** All Clients, Pending Setup, Advisor Linked, Archived
- **Client table:** CLIENT (name, email, type), INVESTED, CURRENT VALUE, LAST LOGIN, STATUS, ACTIONS

This means merging the current admin dashboard and clients page into one page that serves as the admin landing page. The current `/admin/clients/page.tsx` functionality should be absorbed into `/admin/page.tsx`.

---

## Step 10: Seed Data Updates

**File:** `prisma/seed.ts`

- Update advisor seed data to include `accessStartAt` and `DASHBOARD_AND_TAX_DOCUMENTS` permission
- Add Sarah Ellison with firm "Ellison Tax Group", access tags matching mockup
- Add Robert Walsh with firm "Meridian Wealth", DASHBOARD_AND_DOCUMENTS permission
- Ensure seed investment amounts match mockup values exactly ($250K Permian, $150K Garden Park, etc.)

---

## Step 11: Global Styling

**Warm cream background:** Apply `bg-[#faf8f5]` to the main content area in both portal and admin layouts. This is a warm ivory/cream that matches all the mockup backgrounds.

**Card styling:** Cards should have slight warm tint borders, not pure gray. Use `border-[#e8e0d4]` or similar.

**Section headers:** Use uppercase tracking-wider for section headers like "ALLOCATION", "PORTFOLIO GROWTH", "ACTIVE INVESTMENTS", "DOCUMENTS", "RECENT ACTIVITY".

---

## Step 12: Support Ticket System

**Schema:** `prisma/schema.prisma`
```
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
}

model SupportTicket {
  id          String         @id @default(cuid())
  userId      String
  subject     String
  message     String         @db.Text
  status      TicketStatus   @default(OPEN)
  priority    TicketPriority @default(MEDIUM)
  category    String?        // "Account", "Documents", "Investments", "Technical", "Other"
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  user     User            @relation(fields: [userId], references: [id])
  replies  TicketReply[]
}

model TicketReply {
  id        String   @id @default(cuid())
  ticketId  String
  userId    String
  message   String   @db.Text
  createdAt DateTime @default(now())

  ticket SupportTicket @relation(fields: [ticketId], references: [id])
  user   User          @relation(fields: [userId], references: [id])
}
```

Add `supportTickets SupportTicket[]` and `ticketReplies TicketReply[]` relations to `User`.

**Client-side:**
- `src/app/(portal)/support/page.tsx` — Submit new ticket form (subject, category dropdown, message textarea) + list of user's previous tickets with status badges + click to view/reply
- `src/app/api/portal/support/route.ts` — GET (list user's tickets), POST (create ticket)
- `src/app/api/portal/support/[id]/route.ts` — GET (ticket detail with replies), POST (add reply)

**Admin-side:**
- `src/app/(admin)/admin/support/page.tsx` — All tickets list with filters (status, priority, user), click to view/respond
- `src/app/api/admin/support/route.ts` — GET (list all tickets, paginated)
- `src/app/api/admin/support/[id]/route.ts` — GET (detail), PATCH (update status/priority), POST (admin reply)
- Add "Support" to admin sidebar nav under MANAGE section with ticket count badge

---

## Step 13: CSV Export for Admin Client List

**File:** `src/app/api/admin/clients/export/route.ts`
- GET endpoint that accepts same filters as client list (search, status, role)
- Returns CSV with headers: Name, Email, Phone, Company, Total Invested, Current Value, Last Login, Status
- Content-Type: text/csv, Content-Disposition: attachment

**Wire up:** The "Export CSV" button on admin dashboard calls this endpoint.

---

## Files Modified

| File | Change Type |
|------|-------------|
| `prisma/schema.prisma` | Add enum value + field + SupportTicket/TicketReply models |
| `src/app/(portal)/layout.tsx` | Full rewrite |
| `src/app/(admin)/admin/layout.tsx` | Full rewrite |
| `src/app/(portal)/dashboard/page.tsx` | Full rewrite (both states) |
| `src/app/(portal)/documents/page.tsx` | Major rewrite |
| `src/app/(portal)/advisors/page.tsx` | Major rewrite |
| `src/app/(portal)/investments/[id]/page.tsx` | Major rewrite |
| `src/app/(portal)/support/page.tsx` | New — support ticket page |
| `src/app/(admin)/admin/page.tsx` | Merge with clients page |
| `src/app/(admin)/admin/support/page.tsx` | New — admin ticket management |
| `src/app/api/portal/dashboard/route.ts` | Add fields to response |
| `src/app/api/portal/advisors/route.ts` | Add accessStartAt, lastViewedAt |
| `src/app/api/portal/investments/[id]/route.ts` | Add growth data, distribution count |
| `src/app/api/portal/support/route.ts` | New — client ticket CRUD |
| `src/app/api/portal/support/[id]/route.ts` | New — ticket detail + replies |
| `src/app/api/admin/support/route.ts` | New — admin ticket list |
| `src/app/api/admin/support/[id]/route.ts` | New — admin ticket management |
| `src/app/api/admin/clients/export/route.ts` | New — CSV export |
| `prisma/seed.ts` | Update advisor + amount data |

---

## Verification

1. `npm run build` succeeds with zero errors
2. Login as `david.morgan@example.com` / `client123!` — see full dashboard matching screenshot 1
3. Login as `james.whitfield@example.com` / `client123!` — see empty dashboard matching screenshot 5
4. Navigate to Documents — see category sidebar, grouped docs, CPA banner
5. Navigate to Advisor Access — see 4-tier invite form, access tags, access log
6. Navigate to Portfolio → Permian Basin Fund I — see two-column layout, 5 KPIs, chart, disclaimer
7. Login as `admin@partnersandcapital.com` / `admin123!` — see Client Management dashboard matching screenshot 2
8. Commit and push

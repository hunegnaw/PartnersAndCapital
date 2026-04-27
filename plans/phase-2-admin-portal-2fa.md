# Phase 2: Admin Panel, Client Portal & Google Authenticator 2FA

## Context

Phase 1 built the foundation: Next.js 16, Prisma 7 schema (all models), NextAuth 5, Shadcn/ui, route groups with placeholder pages, and deploy scripts. Phase 2 brings the application to life — functional admin CRUD, client-facing dashboard with charts, document management with encrypted storage, advisor sharing, and TOTP 2FA with Google Authenticator. KYC/North Capital integration is deferred to a later phase.

---

## Implementation Steps

### Step 1: Schema Migration
Add `BackupCode` model for 2FA recovery, investment metadata fields, and advisor type field.

**Modify:** `prisma/schema.prisma`
- Add `BackupCode` model (userId, code hash, used flag, usedAt)
- Add `backupCodes BackupCode[]` relation to `User`
- Add to `Investment`: `location`, `targetHoldPeriod`, `distributionCadence`, `fundStatus` (all nullable String)
- Add to `Advisor`: `advisorType` (nullable String — "CPA", "Financial Advisor", etc.)

**Run:** `npx prisma migrate dev --name add-backup-codes-and-fields`

---

### Step 2: Install Shadcn/ui Components
Add components needed across multiple pages.

**Install:** `select`, `textarea`, `progress`, `tooltip`, `skeleton`, `alert`, `switch`, `radio-group`, `checkbox`, `scroll-area`, `popover`

---

### Step 3: Shared Components
Reusable building blocks used by admin and portal pages.

**Create files in `src/components/shared/`:**
- `stat-card.tsx` — KPI card (title, value, subtitle, trend badge). Used on dashboard, admin, investment detail
- `data-table.tsx` — Table with search, filters, pagination, loading state. Uses shadcn `Table`
- `status-badge.tsx` — Maps status enums to colored `Badge` variants
- `empty-state.tsx` — Centered icon + title + description + optional CTA
- `page-header.tsx` — Title, description, breadcrumbs, action buttons
- `confirm-dialog.tsx` — Destructive action confirmation modal
- `file-upload.tsx` — Drag-and-drop + click-to-browse file selector with progress
- `portfolio-growth-chart.tsx` — Recharts `LineChart` wrapper for time series
- `allocation-chart.tsx` — Horizontal bar chart for asset class breakdown

---

### Step 4: File Upload with Encryption

**Create:** `src/lib/upload.ts`
- `saveUploadedFile(file, subdir)` — Encrypts file with AES-256-GCM using `ENCRYPTION_KEY` env var, saves to `uploads/documents/YYYY/uuid.enc`, returns metadata
- `getDecryptedFile(filePath)` — Reads and decrypts file for download streaming
- `deleteUploadedFile(filePath)` — Removes encrypted file from disk
- UUID filenames, MIME type validation (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG), 50MB max

**Modify:** `.env.example` — Add `ENCRYPTION_KEY` (32-byte hex string)

---

### Step 5: Admin API Routes

All use `requireAdmin()` from `src/lib/api-auth.ts`. Every mutation creates an `AuditLog` entry.

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/admin/stats/route.ts` | GET | Dashboard aggregates (total clients, active portals, AUM) |
| `src/app/api/admin/clients/route.ts` | GET, POST | List clients (paginated, search, filter, tabs), create client |
| `src/app/api/admin/clients/[id]/route.ts` | GET, PATCH, DELETE | Client detail, update, soft delete |
| `src/app/api/admin/investments/route.ts` | GET, POST | List/create investments |
| `src/app/api/admin/investments/[id]/route.ts` | GET, PATCH, DELETE | Investment detail, update, soft delete |
| `src/app/api/admin/investments/[id]/clients/route.ts` | GET, POST | Client positions in an investment |
| `src/app/api/admin/investments/[id]/clients/[clientInvestmentId]/route.ts` | PATCH, DELETE | Update/remove a client position |
| `src/app/api/admin/investments/[id]/updates/route.ts` | GET, POST | Deal room updates for an investment |
| `src/app/api/admin/documents/route.ts` | GET, POST | List/upload documents (FormData with encrypted storage) |
| `src/app/api/admin/documents/[id]/route.ts` | GET, PATCH, DELETE | Document metadata, update, soft delete |
| `src/app/api/admin/activity/route.ts` | GET, POST | Activity feed list/create |
| `src/app/api/admin/audit-log/route.ts` | GET | Audit log viewer (read-only, paginated, filtered) |
| `src/app/api/admin/settings/route.ts` | GET, PATCH | Organization settings (SUPER_ADMIN for edits) |
| `src/app/api/admin/advisors/route.ts` | GET | List all advisors across clients |
| `src/app/api/admin/users/route.ts` | GET, POST | Admin user management |
| `src/app/api/admin/users/[id]/route.ts` | PATCH, DELETE | Admin user update/deactivate |

---

### Step 6: Portal API Routes

All use `requireAuth()` and scope queries to `session.user.id`.

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/portal/dashboard/route.ts` | GET | KPIs, allocation, growth data, active investments, recent docs/activity |
| `src/app/api/portal/investments/route.ts` | GET | Client's investment list |
| `src/app/api/portal/investments/[id]/route.ts` | GET | Investment detail with updates, docs, contributions/distributions |
| `src/app/api/portal/documents/route.ts` | GET | Client's documents with category counts, search, filters |
| `src/app/api/portal/documents/[id]/download/route.ts` | GET | Decrypt and stream file download (audit logged) |
| `src/app/api/portal/advisors/route.ts` | GET, POST | List/invite advisors |
| `src/app/api/portal/advisors/[id]/route.ts` | PATCH, DELETE | Update/revoke advisor access |
| `src/app/api/portal/advisors/[id]/resend/route.ts` | POST | Resend invitation email |
| `src/app/api/portal/settings/route.ts` | GET, PATCH | User profile |
| `src/app/api/portal/settings/password/route.ts` | POST | Change password |
| `src/app/api/portal/settings/two-factor/setup/route.ts` | POST | Generate TOTP secret + QR code |
| `src/app/api/portal/settings/two-factor/verify/route.ts` | POST | Verify enrollment code, generate backup codes |
| `src/app/api/portal/settings/two-factor/disable/route.ts` | POST | Disable 2FA (requires valid code) |
| `src/app/api/portal/notifications/route.ts` | GET, PATCH | List notifications, mark as read |
| `src/app/api/portal/capital-activity/route.ts` | GET | Contributions + distributions for the user |

---

### Step 7: Login Page Redesign

**Modify:** `src/app/(auth)/layout.tsx`
- Split-screen: left 50% dark navy panel with branding, right 50% white with form
- Left panel: org name, tagline "Your capital. A clear view.", stats at bottom, legal disclaimer
- Mobile: left panel hidden

**Rewrite:** `src/app/(auth)/login/page.tsx`
- Step 1: Email + password form
- Step 2: 2FA verification (shown when auth returns `2FA_REQUIRED` error)
- 6-digit code input with auto-advance between boxes + paste support
- Backup code fallback mode (single text input)
- "Not a client? Request access" link

**Create:** `src/components/auth/two-factor-input.tsx`
- Reusable 6 individual digit inputs with auto-focus, paste handling

**Modify:** `src/lib/auth.ts`
- Throw `Error("2FA_REQUIRED")` when 2FA enabled but no code provided
- Add backup code verification (check `BackupCode` table, bcrypt compare, mark used)

---

### Step 8: Google Authenticator 2FA Enrollment

**Create:** `src/components/settings/two-factor-setup.tsx`
- Multi-step wizard: Intro -> QR code display -> Verify code -> Show backup codes
- QR code generated via `qrcode` package (already installed)
- Backup codes shown once, with Download/Copy buttons

**Create:** `src/components/settings/two-factor-manage.tsx`
- Status display when 2FA is enabled
- Disable 2FA button (requires current TOTP code)
- Regenerate backup codes button

---

### Step 9: Admin Panel Pages

**Modify:** `src/app/(admin)/admin/layout.tsx`
- Update sidebar: replace "API Keys" with "Advisors" and "Admin Users" per screenshots
- Add count badges next to nav items

**Rewrite all admin pages:**

| Page | Key Features |
|------|-------------|
| `admin/page.tsx` | 3 stat cards, audit status bar, recent activity, quick links |
| `admin/clients/page.tsx` | Stat cards, search + filters, tabs (All/Pending/Advisor Linked/Archived), data table, Add Client dialog |
| `admin/clients/[id]/page.tsx` (new) | Client detail: profile, investments, documents, advisors, activity |
| `admin/investments/page.tsx` | Data table, filter by asset class/status, Add Investment dialog |
| `admin/investments/[id]/page.tsx` (new) | Investment detail: metadata form, client positions table, deal room updates, documents |
| `admin/documents/page.tsx` | Data table, filter by type/year/client/investment, Upload Document dialog with encryption |
| `admin/activity/page.tsx` | Activity feed list, Post Update dialog (broadcast vs targeted) |
| `admin/audit-log/page.tsx` | Read-only data table with filters (action, user, date range), expandable detail rows |
| `admin/settings/page.tsx` | Org settings form: branding, contact, compliance, 2FA policy |

**Create admin components in `src/components/admin/`:**
- `client-form-dialog.tsx`
- `investment-form-dialog.tsx`
- `client-investment-dialog.tsx`
- `document-upload-dialog.tsx`
- `deal-room-update-dialog.tsx`

**Delete:** `admin/api-keys/page.tsx` — Replace with `admin/advisors/page.tsx` and `admin/users/page.tsx`

---

### Step 10: Client Portal Pages

**Rewrite all portal pages:**

| Page | Key Features |
|------|-------------|
| `(portal)/dashboard/page.tsx` | Empty state for new clients (welcome hero, getting started steps) OR full dashboard (4 KPIs, allocation chart, growth chart, investments table, recent docs, activity feed) |
| `(portal)/investments/page.tsx` | Investment cards/list linking to detail |
| `(portal)/investments/[id]/page.tsx` (new) | Breadcrumb, 5 metrics, overview + metadata table, value chart, updates timeline, documents, disclaimer |
| `(portal)/documents/page.tsx` | Category sidebar with counts, CPA access banner, search, year/type/investment filters, grouped document list with download |
| `(portal)/advisors/page.tsx` | Two-column: invite form (name, email, type, access level radio, dates) + active advisors cards + access log |
| `(portal)/settings/page.tsx` | Profile form, password change, 2FA enrollment/management |
| `(portal)/capital-activity/page.tsx` | Summary cards + combined contributions/distributions table |

**Create portal components in `src/components/portal/`:**
- `dashboard-kpis.tsx`, `dashboard-charts.tsx`, `dashboard-investments.tsx`, `dashboard-documents.tsx`, `dashboard-activity.tsx`
- `notification-bell.tsx` — Bell icon in header with unread count dropdown

**Modify:** `src/app/(portal)/layout.tsx` — Add notification bell to header, update nav labels to match screenshots

---

### Step 11: Notification Helpers

**Create:** `src/lib/notifications.ts`
- `createNotification({ userId, type, title, message, link? })` — Creates `Notification` record
- Called from admin document upload, activity post, distribution creation, advisor events

---

### Step 12: Enhanced Seed Data

**Expand:** `prisma/seed.ts`
- 4 investments: Permian Basin Fund I, Garden Park, Private Credit II, Thoroughbred Fund
- 4 client users: David Morgan, Sandra Okafor, James Whitfield, Rachel Tran
- `ClientInvestment` records with realistic amounts matching screenshots
- `Contribution` and `Distribution` records
- 8 documents (K-1s, quarterly reports, subscription agreements)
- `DealRoomUpdate` entries per investment
- `ActivityFeed` entries
- 2 advisor invitations (Sarah Ellison CPA, Robert Walsh Financial Advisor)

---

## Verification

1. **Build check:** `npx prisma generate && npx next build` succeeds
2. **Seed:** `npx prisma db seed` populates all demo data
3. **Login flow:** Login as admin -> see admin dashboard with stats; login as client -> see investor dashboard
4. **2FA:** Enable 2FA in settings -> scan QR with Google Authenticator -> verify code -> see backup codes -> log out -> log back in with TOTP code
5. **Admin CRUD:** Create/edit/archive a client, create an investment, add client to investment, upload a document, post activity update
6. **Client portal:** View dashboard KPIs and charts, browse documents by category, download a document (decrypted), invite an advisor
7. **Encrypted files:** Upload a document as admin, verify the file on disk is encrypted (not readable as PDF), download via portal and verify it opens correctly

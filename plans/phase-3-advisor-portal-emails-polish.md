# Phase 3: Advisor Portal, Email Notifications & Missing Flows

## Context

Phase 2 delivered functional admin CRUD, client portal with charts, document encryption, and TOTP 2FA. However several flows are incomplete:

- **Advisor portal** is a placeholder — advisors can be invited but there's no portal for them to use
- **Advisor invitation emails** are never sent — the invite creates a DB record but no email goes out
- **Reset password page** doesn't exist — forgot-password generates a token and emails a link to `/reset-password?token=...` but that page was never built
- **Notifications are never created** — `createNotification()` exists in `src/lib/notifications.ts` but is never called anywhere
- **Email notifications** are only wired up for forgot-password — no emails for document uploads, advisor invitations, distributions, etc.
- **API v1 routes** have empty directory stubs but no handlers
- **README/MANUAL** are outdated (still say Phase 2 is "Planned")
- **No tests** — Vitest is configured but zero tests exist

Phase 3 addresses all of these gaps except API v1 (deferred to Phase 4) and comprehensive test coverage (deferred to Phase 5).

---

## Implementation Steps

### Step 1: Reset Password Page

The forgot-password flow sends an email with a link to `/reset-password?token=...` but the page doesn't exist.

**Create:** `src/app/(auth)/reset-password/page.tsx`
- Client component
- Reads `token` from URL search params
- Form: new password + confirm password
- Validates password match and minimum length (8 chars)
- POSTs to `/api/auth/reset-password`
- Success state: "Password updated" message with link to login
- Error state: "Invalid or expired token" message

**Create:** `src/app/api/auth/reset-password/route.ts`
- POST handler: `{ token, password }`
- Looks up `PasswordResetToken` by token where `expires > now()`
- If not found or expired: return 400
- Hash new password with bcryptjs (12 rounds)
- Update user's `passwordHash`
- Delete the used token
- Create audit log entry (LOGIN category, "PASSWORD_RESET" action)
- Return success

---

### Step 2: Advisor Invitation Email Flow

When a client invites an advisor, an email should be sent with an accept link.

**Modify:** `src/app/api/portal/advisors/route.ts` (POST handler)
- After creating the Advisor record, call `sendAdvisorInvitationEmail()`
- Pass: advisor name, email, client name, invitation token, permission level

**Create:** `src/lib/email-templates.ts`
- All email HTML templates in one file, using organization branding
- `advisorInvitationEmail({ advisorName, clientName, acceptUrl, permissionLevel, orgName })` — Returns HTML string
- `passwordResetEmail({ resetUrl, orgName })` — Returns HTML string (replace inline HTML in forgot-password route)
- `welcomeClientEmail({ clientName, loginUrl, orgName })` — Returns HTML string
- `documentUploadedEmail({ clientName, documentName, portalUrl, orgName })` — Returns HTML string
- `distributionNotificationEmail({ clientName, investmentName, amount, portalUrl, orgName })` — Returns HTML string
- All templates: clean, professional, mobile-responsive, org-branded with primary color header

**Create:** `src/app/(auth)/advisor-accept/page.tsx`
- Reads `token` from URL search params
- Calls `GET /api/auth/advisor-accept?token=...` to validate token and show invitation details
- If advisor already has an account: show login link
- If advisor is new: show registration form (name, password)
- On submit: POST to `/api/auth/advisor-accept` to create ADVISOR user, link to Advisor record, set status to ACTIVE

**Create:** `src/app/api/auth/advisor-accept/route.ts`
- GET: Validate invitation token, return advisor details (client name, permission level)
- POST: `{ token, name, password }`
  - Create User with role ADVISOR (or link existing user)
  - Update Advisor: set `advisorUserId`, `status = ACTIVE`, `acceptedAt = now()`
  - Hash password, create user
  - Create audit log entry
  - Return success with redirect URL

**Modify:** `src/app/api/portal/advisors/[id]/resend/route.ts`
- Wire up to actually send the invitation email (currently likely just a stub)

---

### Step 3: Advisor Portal Pages

Full read-only portal for advisors based on their permission level.

**Modify:** `src/app/(advisor)/layout.tsx`
- Add proper sidebar navigation (similar to portal layout but simplified)
- Nav items: Dashboard, Investments (if permission allows), Documents (if permission allows)
- Header with advisor name, client name they're viewing for, and logout
- Fetch advisor's permission level to conditionally show nav items

**Create:** `src/app/api/advisor/dashboard/route.ts`
- GET: Fetch advisor's linked client data based on AdvisorAccess permissions
- DASHBOARD_ONLY: KPI summary (total invested, current value, total distributions)
- DASHBOARD_AND_DOCUMENTS: Above + document list
- SPECIFIC_INVESTMENT: Only data for the specified investment

**Create:** `src/app/api/advisor/investments/route.ts`
- GET: List investments the advisor has access to (scoped by permission level)

**Create:** `src/app/api/advisor/investments/[id]/route.ts`
- GET: Investment detail (only if advisor has access)

**Create:** `src/app/api/advisor/documents/route.ts`
- GET: Documents the advisor can view (scoped by permission)

**Create:** `src/app/api/advisor/documents/[id]/download/route.ts`
- GET: Decrypt and stream document download (audit logged, permission checked)

**Rewrite:** `src/app/(advisor)/advisor/dashboard/page.tsx`
- KPI cards showing client portfolio summary
- Investment allocation overview
- Recent activity (if DASHBOARD_AND_DOCUMENTS or higher)
- "You have read-only access to [Client Name]'s portfolio" banner

**Create:** `src/app/(advisor)/advisor/investments/page.tsx`
- Investment list (cards or table) scoped to advisor's access level
- Links to investment detail

**Create:** `src/app/(advisor)/advisor/investments/[id]/page.tsx`
- Investment detail: metrics, overview, updates timeline
- Read-only — no edit actions

**Create:** `src/app/(advisor)/advisor/documents/page.tsx`
- Document list with category filters and download buttons
- Only visible if permission is DASHBOARD_AND_DOCUMENTS or SPECIFIC_INVESTMENT with doc access

---

### Step 4: Wire Up Notifications

`createNotification()` exists but is never called. Wire it into all admin mutation endpoints.

**Modify these API routes to call `createNotification()`:**

| Route | Event | Notification |
|-------|-------|-------------|
| `api/admin/documents/route.ts` (POST) | Document uploaded | Notify the document's client: "New document: {name}" |
| `api/admin/activity/route.ts` (POST) | Activity post created | Notify all clients (broadcast) or targeted client |
| `api/admin/investments/[id]/updates/route.ts` (POST) | Deal room update | Notify all clients in that investment |
| `api/admin/investments/[id]/clients/route.ts` (POST) | Client added to investment | Notify the client: "You've been added to {investment}" |
| `api/admin/clients/route.ts` (POST) | Client created | Send welcome email to the new client |
| `api/portal/advisors/route.ts` (POST) | Advisor invited | Notify client: "You invited {advisor} as an advisor" |

**Modify:** `src/lib/notifications.ts`
- Add notification type constants: `DOCUMENT_UPLOADED`, `ACTIVITY_POST`, `DEAL_ROOM_UPDATE`, `INVESTMENT_ADDED`, `ADVISOR_INVITED`, `ADVISOR_ACCEPTED`

---

### Step 5: Email Notifications for Key Events

Send actual emails (not just in-app notifications) for high-priority events.

**Modify these API routes to call `sendEmail()` with templates from Step 2:**

| Route | Email Sent To | Template |
|-------|--------------|----------|
| `api/admin/documents/route.ts` (POST) | Client | documentUploadedEmail |
| `api/admin/clients/route.ts` (POST) | New client | welcomeClientEmail (with temporary password or login link) |
| `api/portal/advisors/route.ts` (POST) | Advisor | advisorInvitationEmail |
| `api/portal/advisors/[id]/resend/route.ts` (POST) | Advisor | advisorInvitationEmail |

Note: Email sending should be non-blocking — use `sendEmail().catch(console.error)` so API responses aren't delayed by email delivery.

---

### Step 6: Admin Client Creation Email

When an admin creates a new client, the client needs a way to log in.

**Modify:** `src/app/api/admin/clients/route.ts` (POST handler)
- After creating the user, generate a `PasswordResetToken`
- Send welcome email with a "Set your password" link pointing to `/reset-password?token=...`
- The reset-password page from Step 1 handles the rest

---

### Step 7: Update README and MANUAL

**Modify:** `README.md`
- Update phase descriptions to reflect actual completion status
- Phase 1: Foundation — COMPLETED
- Phase 2: Admin Panel, Client Portal & 2FA — COMPLETED
- Phase 3: Advisor Portal, Emails & Polish — COMPLETED
- Phase 4: API Integrations & Webhooks — Planned
- Phase 5: Testing, Hardening & Analytics — Planned
- Add advisor portal section to project structure
- Add email templates section
- Document advisor invitation flow

**Modify:** `MANUAL.md`
- Add advisor portal usage guide
- Add password reset flow documentation
- Add email notification descriptions
- Update feature roadmap
- Document advisor permission levels and what each sees

---

## Files Summary

**New files (~18):**
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/(auth)/advisor-accept/page.tsx`
- `src/app/api/auth/advisor-accept/route.ts`
- `src/lib/email-templates.ts`
- `src/app/api/advisor/dashboard/route.ts`
- `src/app/api/advisor/investments/route.ts`
- `src/app/api/advisor/investments/[id]/route.ts`
- `src/app/api/advisor/documents/route.ts`
- `src/app/api/advisor/documents/[id]/download/route.ts`
- `src/app/(advisor)/advisor/investments/page.tsx`
- `src/app/(advisor)/advisor/investments/[id]/page.tsx`
- `src/app/(advisor)/advisor/documents/page.tsx`

**Modified files (~12):**
- `src/app/(advisor)/layout.tsx` (full rewrite with sidebar nav)
- `src/app/(advisor)/advisor/dashboard/page.tsx` (full rewrite)
- `src/app/api/portal/advisors/route.ts` (add email sending)
- `src/app/api/portal/advisors/[id]/resend/route.ts` (wire up email)
- `src/app/api/admin/documents/route.ts` (add notifications + email)
- `src/app/api/admin/activity/route.ts` (add notifications)
- `src/app/api/admin/investments/[id]/updates/route.ts` (add notifications)
- `src/app/api/admin/investments/[id]/clients/route.ts` (add notifications)
- `src/app/api/admin/clients/route.ts` (add welcome email)
- `src/app/api/auth/forgot-password/route.ts` (use email template)
- `src/lib/notifications.ts` (add type constants)
- `README.md`
- `MANUAL.md`

---

## Verification

1. **Build check:** `npm run build` succeeds with zero errors
2. **Forgot password flow:** Submit email → receive email → click link → land on reset-password page → set new password → login with new password
3. **Advisor invitation flow:** Client invites advisor → advisor receives email → clicks accept link → creates account → logs in → sees advisor dashboard with read-only client data
4. **Advisor permissions:** DASHBOARD_ONLY advisor sees only KPIs. DASHBOARD_AND_DOCUMENTS advisor sees KPIs + documents + download. SPECIFIC_INVESTMENT advisor sees only one investment.
5. **In-app notifications:** Upload a document as admin → client sees notification bell count increase → clicks bell → sees "New document: K-1 2024"
6. **Email notifications:** Upload a document as admin → client receives email with document name and portal link
7. **Admin client creation:** Create client as admin → client receives welcome email → clicks "Set your password" → sets password → logs in

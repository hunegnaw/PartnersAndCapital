# Phases 3-6: Gap Fill + Integrations + Hardening

## Context

The mockup integration plan (Phase 3/4 UI) is complete. All pages render with real data and match the design screenshots. However, an audit revealed 12 functional gaps across Phases 3-6. This plan fills every gap in one pass.

---

## Part A: Phase 3 Gaps (Client Portal Completion)

### A1. Password Reset Page + API

The forgot-password flow sends an email with a reset link, but the destination page and API don't exist — the link 404s.

**New files:**

1. `src/app/(auth)/reset-password/page.tsx`
   - URL: `/reset-password?token=...`
   - UI: Token validation on load, then new password + confirm password form
   - On submit: POST to reset API
   - Success: "Password updated" message + link to login
   - Error states: expired token, invalid token, password mismatch

2. `src/app/api/auth/reset-password/route.ts`
   - POST: Accept `{ token, password }`
   - Validate token exists in `PasswordResetToken` table and hasn't expired (1 hour)
   - Hash new password with bcrypt
   - Update user's password
   - Delete the token (single-use)
   - Create audit log entry
   - Return success

### A2. Wire Notification Creation to Real Events

The `createNotification()` function exists in `src/lib/notifications.ts` but is never called.

**Wire into these API routes:**

| API Route | Event | Notification |
|-----------|-------|-------------|
| `POST /api/admin/documents` | Admin uploads document | Notify document owner: "New document: {title}" |
| `POST /api/admin/investments/[id]/clients` | Admin adds client to investment | Notify client: "You've been added to {investment}" |
| `POST /api/admin/investments/[id]/clients/[id]` | Admin updates position (distribution) | Notify client: "Distribution recorded for {investment}" |
| `POST /api/admin/support/[id]` | Admin replies to ticket | Notify ticket owner: "New reply on: {subject}" |
| `POST /api/portal/advisors` | Client invites advisor | Notify client: "Advisor invitation sent to {email}" |
| `PATCH /api/admin/support/[id]` | Admin changes ticket status | Notify ticket owner: "Ticket updated: {subject}" |

**Implementation:** Import `createNotification` from `@/lib/notifications` and call it after the primary database operation succeeds. Use appropriate `type` values: "DOCUMENT", "INVESTMENT", "DISTRIBUTION", "SUPPORT", "ADVISOR".

### A3. Admin Notification on New Support Ticket

When a client submits a support ticket, create a notification for all SUPER_ADMIN / ADMIN users:

| API Route | Event | Notification |
|-----------|-------|-------------|
| `POST /api/portal/support` | Client creates ticket | Notify all admins: "New support ticket: {subject}" |

---

## Part B: Phase 4 Gaps (Advisor Sharing)

### B1. Advisor Invitation Emails

**File:** `src/app/api/portal/advisors/route.ts` (POST handler)

After creating the Advisor + AdvisorAccess records, call `sendEmail()` with:
- To: advisor's email
- Subject: "{clientName} has invited you to view their portfolio"
- Body: HTML email with invitation link: `{NEXTAUTH_URL}/advisor/accept?token={invitationToken}`
- Include: client name, permission level description, expiration date

**File:** `src/app/api/portal/advisors/[id]/resend/route.ts`

Same email template, just re-sent with the new token.

### B2. Advisor Accept Page + API

**New files:**

1. `src/app/(auth)/advisor-accept/page.tsx`
   - URL: `/advisor-accept?token=...`
   - Flow:
     - Validate token against Advisor table
     - If advisor has no User account: show registration form (name, password)
     - If advisor already has a User account: show "Accept invitation" button
     - On accept: Create user (if needed), set advisor status to ACTIVE, set acceptedAt
   - Redirect to `/advisor/dashboard` on success

2. `src/app/api/auth/advisor-accept/route.ts`
   - POST: Accept `{ token, name?, password? }`
   - Validate invitation token
   - If new user: Create User with role ADVISOR, hash password
   - Update Advisor: status = ACTIVE, acceptedAt = now, link userId
   - Create audit log entry
   - Return success with session info

### B3. Advisor Portal (Full Implementation)

Replace the placeholder at `src/app/(advisor)/advisor/dashboard/page.tsx` with a real advisor experience.

**New layout:** `src/app/(advisor)/layout.tsx`
- Light sidebar matching portal design
- Nav items: Dashboard, [Client Name] sections based on access
- Header: "PARTNERS + CAPITAL" + "Advisor Portal" badge

**New pages:**

1. `src/app/(advisor)/advisor/dashboard/page.tsx` — Overview of all clients the advisor has access to. Show: client name, permission level, last updated, access expiry.

2. `src/app/(advisor)/advisor/clients/[id]/page.tsx` — View a specific client's portfolio (scoped by permission level):
   - DASHBOARD_ONLY: KPI cards + allocation only
   - DASHBOARD_AND_TAX_DOCUMENTS: KPIs + tax documents (K-1s, 1099s)
   - DASHBOARD_AND_DOCUMENTS: KPIs + all documents
   - SPECIFIC_INVESTMENT: Only the specified investment detail

3. `src/app/(advisor)/advisor/clients/[id]/documents/page.tsx` — Document list (filtered by permission)

**New API routes:**

1. `src/app/api/advisor/dashboard/route.ts`
   - GET: Return all clients the advisor has active access to
   - Join through Advisor -> AdvisorAccess -> User
   - Include summary data per client (total invested, current value)

2. `src/app/api/advisor/clients/[id]/route.ts`
   - GET: Return client portfolio data scoped by advisor's permission level
   - Validate advisor has active, non-expired access to this client
   - Filter response based on permission level

3. `src/app/api/advisor/clients/[id]/documents/route.ts`
   - GET: Return documents scoped by permission
   - DASHBOARD_AND_TAX_DOCUMENTS: only docType in ["K-1", "1099"]
   - DASHBOARD_AND_DOCUMENTS: all documents
   - Create audit log entry on access

**Auth helper:** Add `requireAdvisor()` to `src/lib/api-auth.ts` — validates the user has role ADVISOR and returns the user.

---

## Part C: Phase 5 (Integrations & Notifications)

### C1. Email Templates Library

**New file:** `src/lib/email-templates.ts`

Centralized HTML email templates with consistent branding:
- `advisorInviteEmail({ clientName, advisorName, permissionLevel, expiresAt, acceptUrl })`
- `passwordResetEmail({ userName, resetUrl })`
- `ticketReplyEmail({ userName, ticketSubject, replyPreview, ticketUrl })`
- `documentUploadedEmail({ userName, documentTitle, portalUrl })`
- `distributionNoticeEmail({ userName, investmentName, amount, portalUrl })`
- `welcomeEmail({ userName, loginUrl })`

All templates share:
- "PARTNERS + CAPITAL" header with navy background
- Warm cream body background
- Gold accent button
- Footer with company info and unsubscribe (if applicable)

### C2. Wire Transactional Emails

| Event | Email Recipient | Template |
|-------|----------------|----------|
| Advisor invited | Advisor | `advisorInviteEmail` |
| Advisor invite resent | Advisor | `advisorInviteEmail` |
| Password reset requested | User | `passwordResetEmail` (already done) |
| Admin replies to support ticket | Client | `ticketReplyEmail` |
| Client replies to support ticket | All admins | `ticketReplyEmail` |
| Admin uploads document for client | Client | `documentUploadedEmail` |
| Admin records distribution | Client | `distributionNoticeEmail` |
| New client account created | Client | `welcomeEmail` |

**Implementation:** Call `sendEmail()` from the relevant API route after the DB operation. Use the template functions to generate HTML body.

### C3. Update Existing Forgot-Password Email

Replace the inline HTML in `src/app/api/auth/forgot-password/route.ts` with the `passwordResetEmail` template from the templates library for consistent branding.

### C4. QuickBooks API Integration (Deferred)

Mark as Phase 5b — requires QuickBooks developer account and OAuth setup. Create the integration scaffold:
- `src/app/api/v1/quickbooks/route.ts` — Webhook receiver
- `src/lib/quickbooks.ts` — Client wrapper (deferred implementation)
- Document the API key pattern already in the schema

---

## Part D: Phase 6 (Hardening & Analytics)

### D1. Rate Limiting

**New file:** `src/lib/rate-limit.ts`

Simple in-memory rate limiter (no Redis dependency for single-server):
- `rateLimit({ windowMs, maxRequests })` — returns middleware-like function
- Track by IP address
- Uses Map with TTL cleanup

**Apply to:**
| Route | Limit |
|-------|-------|
| `POST /api/auth/[...nextauth]` (login) | 5 attempts per 15 minutes per IP |
| `POST /api/auth/forgot-password` | 3 attempts per 15 minutes per IP |
| `POST /api/auth/signup` | 5 attempts per hour per IP |
| `POST /api/auth/reset-password` | 5 attempts per 15 minutes per IP |
| `POST /api/portal/support` | 10 tickets per hour per user |
| `POST /api/auth/advisor-accept` | 5 attempts per 15 minutes per IP |

### D2. Input Validation Hardening

**New file:** `src/lib/validation.ts`

Zod schemas for all user-facing inputs:
- `loginSchema` — email format, password min 8
- `signupSchema` — email, password, name required
- `resetPasswordSchema` — token, password min 8
- `supportTicketSchema` — subject (max 200), message (max 5000), category enum
- `advisorInviteSchema` — name, email format, permissionLevel enum, dates
- `profileUpdateSchema` — name, phone, company (all optional strings, max lengths)
- `ticketReplySchema` — message (max 5000)

**Apply to:** All POST/PATCH API routes that accept user input. Replace manual `if (!field)` checks with `schema.parse(body)` wrapped in try/catch returning 400 on validation error.

### D3. GA4 Integration

**New file:** `src/components/analytics/google-analytics.tsx`

- Server component that renders the GA4 script tag
- Reads `NEXT_PUBLIC_GA4_ID` from environment
- Only renders when the env var is set (no-op in development)
- Add to root layout (`src/app/layout.tsx`)

**Page view tracking:**
- GA4 handles basic page views automatically with the gtag script
- Add `reportWebVitals` in `src/app/layout.tsx` to send Core Web Vitals to GA4

**Custom events (optional, via `gtag()` calls):**
- Login success
- Document download
- Support ticket submitted
- Advisor invited

### D4. Security Headers

Add security headers via `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### D5. Error Boundary

**New file:** `src/app/error.tsx` (root error boundary)
- Branded error page matching site design
- "Something went wrong" message with "Try again" button
- Log error to console (and optionally to external service later)

**New file:** `src/app/not-found.tsx` (custom 404)
- Branded 404 page: "Page not found" with link back to dashboard

---

## Implementation Order

1. **A1** — Password reset page + API (unblocks forgot-password flow)
2. **B1** — Advisor invitation emails (unblocks advisor flow)
3. **B2** — Advisor accept page + API (unblocks advisor onboarding)
4. **B3** — Advisor portal pages + APIs (completes Phase 4)
5. **A2/A3** — Wire notifications to real events
6. **C1** — Email templates library
7. **C2/C3** — Wire transactional emails everywhere
8. **D1** — Rate limiting
9. **D2** — Input validation with Zod
10. **D3** — GA4 integration
11. **D4** — Security headers
12. **D5** — Error boundary + 404 page
13. Update MANUAL.md with all new features
14. Commit and push

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/app/(auth)/reset-password/page.tsx` | Password reset form |
| `src/app/api/auth/reset-password/route.ts` | Password reset API |
| `src/app/(auth)/advisor-accept/page.tsx` | Advisor invitation acceptance |
| `src/app/api/auth/advisor-accept/route.ts` | Advisor accept API |
| `src/app/(advisor)/layout.tsx` | Advisor portal layout |
| `src/app/(advisor)/advisor/dashboard/page.tsx` | Advisor dashboard (rewrite) |
| `src/app/(advisor)/advisor/clients/[id]/page.tsx` | Advisor client view |
| `src/app/(advisor)/advisor/clients/[id]/documents/page.tsx` | Advisor documents |
| `src/app/api/advisor/dashboard/route.ts` | Advisor dashboard API |
| `src/app/api/advisor/clients/[id]/route.ts` | Advisor client data API |
| `src/app/api/advisor/clients/[id]/documents/route.ts` | Advisor documents API |
| `src/lib/email-templates.ts` | Branded email templates |
| `src/lib/rate-limit.ts` | In-memory rate limiter |
| `src/lib/validation.ts` | Zod validation schemas |
| `src/components/analytics/google-analytics.tsx` | GA4 script component |
| `src/app/error.tsx` | Root error boundary |
| `src/app/not-found.tsx` | Custom 404 page |

### Modified Files
| File | Change |
|------|--------|
| `src/app/api/portal/advisors/route.ts` | Wire sendEmail on invite |
| `src/app/api/portal/advisors/[id]/resend/route.ts` | Wire sendEmail on resend |
| `src/app/api/admin/documents/route.ts` | Wire notification on upload |
| `src/app/api/admin/investments/[id]/clients/route.ts` | Wire notification on add |
| `src/app/api/admin/investments/[id]/clients/[id]/route.ts` | Wire notification on distribution |
| `src/app/api/admin/support/[id]/route.ts` | Wire notification + email on reply |
| `src/app/api/portal/support/route.ts` | Wire admin notification on new ticket |
| `src/app/api/auth/forgot-password/route.ts` | Use email template, add rate limit |
| `src/app/api/auth/[...nextauth]/route.ts` | Add rate limit |
| `src/app/api/auth/signup/route.ts` | Add rate limit + validation |
| `src/lib/api-auth.ts` | Add requireAdvisor() |
| `src/app/layout.tsx` | Add GA4 component |
| `next.config.ts` | Add security headers |
| `MANUAL.md` | Document all new features |

---

## Verification

1. `npm run build` succeeds with zero errors
2. Forgot password → email → click link → reset password → login works
3. Invite advisor → advisor gets email → click accept → create account → see advisor dashboard
4. Advisor can see client data scoped by permission level
5. Notifications appear in bell when admin uploads document, replies to ticket, etc.
6. Rate limiting blocks excessive login/reset attempts
7. GA4 script loads in production (when env var set)
8. Custom 404 page renders on invalid routes
9. Error boundary catches and displays runtime errors gracefully

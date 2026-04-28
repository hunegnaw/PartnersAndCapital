# Admin "View as Client" — Read-Only Impersonation

## Context

Admins need to see exactly what a client sees in the portal — same layout, same data, same experience — without being able to modify anything. This is useful for support, troubleshooting, and verifying a client's view. All write operations (create, update, delete) must be blocked while impersonating.

---

## Approach

Use a **cookie-based impersonation session** (not JWT modification, since NextAuth JWT is immutable once issued without re-signing). When an admin clicks "View as Client", we:

1. Set a server-readable cookie `impersonating=<clientId>` (HTTP-only, secure)
2. Redirect to the client portal `/dashboard`
3. All portal API routes check for the impersonation cookie — if present and the real session is ADMIN/SUPER_ADMIN, use the impersonated client ID for data queries
4. Block ALL write operations (POST/PUT/PATCH/DELETE that mutate data) while impersonating — return 403
5. Show a persistent banner at the top of the page: "Viewing as [Client Name] — Exit"
6. "Exit" clears the cookie and redirects back to `/admin/clients/[id]`

**Why cookies over JWT modification:**
- NextAuth JWT is signed and can't be modified client-side
- Cookies are simple, immediate, and don't require re-authentication
- Easy to clear on exit
- Server-side validation still checks the real JWT role is ADMIN

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/impersonation.ts` | Helper: get impersonation context from cookies + validate admin role |
| `src/app/api/admin/impersonate/route.ts` | POST: start impersonation (set cookie), DELETE: end impersonation (clear cookie) |
| `src/components/impersonation-banner.tsx` | Persistent top banner shown during impersonation |

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/api-auth.ts` | Add `getEffectiveUserId()` helper that returns impersonated ID or real ID |
| `src/app/(portal)/layout.tsx` | Allow ADMIN/SUPER_ADMIN access when impersonating; render impersonation banner |
| `src/app/api/portal/dashboard/route.ts` | Use `getEffectiveUserId()` instead of `user.id` |
| `src/app/api/portal/investments/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/investments/[id]/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/documents/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/documents/[id]/download/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/capital-activity/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/advisors/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/notifications/route.ts` | Use `getEffectiveUserId()` |
| `src/app/api/portal/support/route.ts` | Use `getEffectiveUserId()`, block writes |
| `src/app/api/portal/settings/route.ts` | Block writes when impersonating |
| `src/app/api/portal/settings/password/route.ts` | Block writes when impersonating |
| `src/app/api/portal/settings/two-factor/*/route.ts` | Block writes when impersonating |
| `src/app/(admin)/admin/clients/[id]/page.tsx` | Add "View as Client" button |
| `MANUAL.md` | Document the impersonation feature |

---

## Implementation

### Phase 1: Impersonation Library (`src/lib/impersonation.ts`)

```ts
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const COOKIE_NAME = "impersonating";

export async function getImpersonationContext() {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) return null;

  const cookieStore = await cookies();
  const clientId = cookieStore.get(COOKIE_NAME)?.value;
  if (!clientId) return null;

  return {
    adminId: session.user.id,
    clientId,
    isImpersonating: true,
  };
}

export async function getEffectiveUserId(): Promise<{ userId: string; isImpersonating: boolean }> {
  const impersonation = await getImpersonationContext();
  if (impersonation) {
    return { userId: impersonation.clientId, isImpersonating: true };
  }
  // Fall back to normal auth
  const session = await auth();
  return { userId: session!.user.id, isImpersonating: false };
}
```

### Phase 2: Impersonation API (`src/app/api/admin/impersonate/route.ts`)

- **POST** `{ clientId }`: Validate admin session, verify client exists, set HTTP-only cookie, audit log, return success
- **DELETE**: Clear cookie, audit log, return success

### Phase 3: Portal Layout Guard Update

Currently rejects non-CLIENT roles. Update to also allow ADMIN/SUPER_ADMIN when the impersonation cookie is set:

```ts
// Current:
if (session.user.role !== "CLIENT") { redirect... }

// New:
const impersonation = await getImpersonationContext();
if (session.user.role !== "CLIENT" && !impersonation) { redirect... }
```

Render `<ImpersonationBanner />` at the top when impersonating.

### Phase 4: Read-Only Enforcement

Add a `requireNotImpersonating()` guard that blocks mutations:

```ts
export async function requireNotImpersonating() {
  const ctx = await getImpersonationContext();
  if (ctx) {
    return NextResponse.json(
      { error: "Cannot modify data while viewing as another user" },
      { status: 403 }
    );
  }
  return null;
}
```

Apply to all write endpoints in the portal:
- POST/PATCH/DELETE in `/api/portal/settings/*`
- POST in `/api/portal/support`
- POST/DELETE in `/api/portal/advisors/*`

### Phase 5: Update Portal API Routes (Read Paths)

For each portal GET route, replace direct `user.id` usage with `getEffectiveUserId()`:

```ts
// Before:
const user = await requireAuth();
const data = await prisma.clientInvestment.findMany({ where: { userId: user.id } });

// After:
const user = await requireAuth();
const { userId } = await getEffectiveUserId();
const data = await prisma.clientInvestment.findMany({ where: { userId } });
```

### Phase 6: Impersonation Banner Component

Fixed-position banner at the top of the portal when impersonating. Shows client name and "Exit" button. Uses a client component that calls DELETE `/api/admin/impersonate` then redirects.

### Phase 7: "View as Client" Button on Admin Client Page

Add a button next to "Edit Client" on `/admin/clients/[id]` that POSTs to `/api/admin/impersonate` with the client ID, then navigates to `/dashboard`.

---

## Verification

1. `npm run build` passes
2. Admin navigates to `/admin/clients/[id]` → clicks "View as Client" → sees client portal with banner
3. All read pages work (dashboard, investments, documents, capital activity, support)
4. All write operations return 403 (settings save, password change, support ticket creation, 2FA changes)
5. "Exit" button returns admin to admin panel
6. Audit log records impersonation start/end
7. Non-admin users cannot set the impersonation cookie (server validates role)
8. Commit and push

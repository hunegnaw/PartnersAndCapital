# Unified Plan: Page Heroes + Typography Settings + 2FA Policy Enforcement

## Context

Three features to implement in one pass:

1. **Page Hero Images** — Every non-homepage page should display a hero banner with the page title. Pages currently lack a `featuredImageUrl` field (blog posts already have one). Need schema change, admin UI, and a shared `PageHero` component.

2. **Typography & Font Settings** — Admin-configurable fonts (Google Fonts), weights, styles, colors, and sizes for 5 text categories (hero title, subtitle, body, admin, portal). Currently hardcoded to Geist. Need a `typography` JSON field on Organization, an admin settings UI, a dynamic font loader, and CSS variable injection.

3. **2FA Policy Enforcement** — The Organization model already has `twoFactorPolicy` (mandatory/optional/disabled) and SMS 2FA via Twilio already works, but the policy is never checked. Need to wire it up so mandatory forces 2FA setup, disabled hides the option, and optional keeps current behavior.

---

## Feature 1: Page Hero Images

### 1A. Schema — add `featuredImageUrl` to Page
**File:** `prisma/schema.prisma`
- Add `featuredImageUrl String?` to Page model (after `isBlogPage`)
- Run `npx prisma db push`

### 1B. Admin page editor — Hero Image card
**Files:**
- `src/app/(admin)/admin/pages/[id]/edit/page.tsx`
- `src/app/(admin)/admin/pages/new/page.tsx`

Add "Hero Image" card in sidebar with MediaPicker + preview + clear button. Send `featuredImageUrl` in form payload.

### 1C. Page API routes — accept `featuredImageUrl`
**Files:**
- `src/app/api/admin/pages/route.ts` (POST)
- `src/app/api/admin/pages/[id]/route.ts` (PATCH)

### 1D. PageHero component
**New file:** `src/components/marketing/page-hero.tsx`
- 600px tall, full-bleed background image with dark overlay (or solid navy `#1A2640` if no image)
- Page title centered, white, uses typography CSS variables (from Feature 2)

### 1E. Public [slug] page — render hero
**File:** `src/app/(marketing)/[slug]/page.tsx`
- Fetch `featuredImageUrl` and `isHomepage`
- If not homepage: render `<PageHero>` above `<BlockRenderer>`

### 1F. Blog post page — use PageHero
**File:** `src/app/(marketing)/blog/[slug]/page.tsx`
- Replace inline hero with shared `<PageHero>` component

---

## Feature 2: Typography & Font Settings

### 2A. Schema — add `typography` JSON to Organization
**File:** `prisma/schema.prisma`
- Add `typography Json?` to Organization model

Shape:
```json
{
  "heroTitle":  { "fontFamily": "Playfair Display", "fontWeight": "700", "fontStyle": "normal", "color": "#ffffff", "fontSize": "48px" },
  "subtitle":   { "fontFamily": "Open Sans", "fontWeight": "600", "fontStyle": "normal", "color": "#1A2640", "fontSize": "24px" },
  "body":       { "fontFamily": "Open Sans", "fontWeight": "400", "fontStyle": "normal", "color": "#333333", "fontSize": "16px" },
  "adminBody":  { "fontFamily": "Inter", "fontWeight": "400", "fontStyle": "normal", "color": "#333333", "fontSize": "14px" },
  "portalBody": { "fontFamily": "Inter", "fontWeight": "400", "fontStyle": "normal", "color": "#333333", "fontSize": "14px" }
}
```

### 2B. Google Fonts utility
**New file:** `src/lib/google-fonts.ts`
- Port curated list (~47 fonts) from `~/Clients/theismlab.com/src/lib/google-fonts.ts`
- Export `GOOGLE_FONTS` array and `getGoogleFontUrl(families: string[]): string`
- Skip PDF-related functions (not needed here)

### 2C. Typography types
**New file:** `src/lib/typography.ts`
- `FontSetting` interface: `{ fontFamily, fontWeight, fontStyle, color, fontSize }`
- `TypographySettings` type with 5 categories
- `DEFAULT_TYPOGRAPHY` constant with Geist-based defaults
- `mergeTypography(saved?: Partial<TypographySettings>): TypographySettings` — deep-merge saved over defaults

### 2D. Settings API — accept `typography`
**File:** `src/app/api/admin/settings/route.ts`
- Add `typography` to destructured body fields and conditional update

### 2E. Admin Settings UI — Typography card
**File:** `src/app/(admin)/admin/settings/page.tsx`
- New "Typography" card between Branding and Contact
- For each of 5 categories: font family combobox (Google Fonts list), weight select (100-900), style select (normal/italic), color hex input with swatch, font size input
- Live preview text for each row

### 2F. Organization provider — expose typography
**File:** `src/components/providers/organization-provider.tsx`
- Add `typography: TypographySettings` to `OrgConfig` interface
- Fetch and merge with defaults via `mergeTypography()`
- Also add `email`, `phone`, `address` fields for the dynamic contact form fix

### 2G. FontLoader component
**New file:** `src/components/providers/font-loader.tsx`
- Client component reading typography from `useOrganization()`
- Injects `<link>` for Google Fonts CSS
- Injects `<style>` setting CSS custom properties (e.g. `--font-hero-title`, `--font-body`, etc.)

### 2H. Root layout — include FontLoader
**File:** `src/app/layout.tsx`
- Add `<FontLoader />` inside `<OrganizationProvider>`
- Keep Geist as fallback

### 2I. Apply CSS variables
- `src/components/marketing/page-hero.tsx` — use `--font-hero-title-*` variables
- `src/components/blocks/contact-form-block.tsx` — make dynamic (pull address/email/phone from org context instead of hardcoded values)
- Marketing pages inherit `--font-body-*` and `--font-subtitle-*` via globals

---

## Feature 3: 2FA Policy Enforcement

### Existing infrastructure (no changes needed):
- `src/lib/sms.ts` — Twilio SMS sending (already works)
- `src/lib/two-factor.ts` — TOTP generate/verify/send (already works)
- `Organization.twoFactorPolicy` field (already in schema, default "optional")
- User model: `twoFactorEnabled`, `phone`, `TwoFactorSecret` relation

### 3A. Auth flow — check policy on login
**File:** `src/lib/auth.ts`
- In Credentials provider `authorize()`: after successful password check, fetch org `twoFactorPolicy`
- If policy = "disabled": skip 2FA entirely, sign in directly (even if user previously set up 2FA)
- If policy = "mandatory" and user has no 2FA: return a session flag `requiresTwoFactorSetup: true` instead of completing login
- If policy = "mandatory" and user has 2FA: proceed with existing SMS code flow
- If policy = "optional": current behavior (check `twoFactorEnabled` per-user)

### 3B. Session types — add setup flag
**File:** `src/lib/auth.ts` (session/jwt callbacks)
- Add `requiresTwoFactorSetup` boolean to JWT/session type
- When set, user can only access the 2FA setup page

### 3C. Layout guards — redirect to 2FA setup
**Files:**
- `src/app/(portal)/layout.tsx`
- `src/app/(admin)/admin/layout.tsx`
- If `session.requiresTwoFactorSetup`: redirect to `/portal/settings` (or a dedicated setup page)

### 3D. Portal settings — respect policy
**File:** `src/components/settings/two-factor-setup.tsx` (or equivalent)
- If policy = "disabled": hide the 2FA section entirely
- If policy = "mandatory": show 2FA section but disable the "disable" button (display message: "Required by your organization")
- If policy = "optional": current behavior

### 3E. Admin settings — clarify policy descriptions
**File:** `src/app/(admin)/admin/settings/page.tsx`
- In Security card: update the 2FA policy radio descriptions to be clearer:
  - Mandatory: "All users must set up SMS two-factor authentication"
  - Optional: "Users can choose to enable SMS two-factor authentication"
  - Disabled: "Two-factor authentication is turned off for all users"

---

## File Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `featuredImageUrl` to Page, `typography` to Organization |
| `src/app/api/admin/pages/route.ts` | Accept `featuredImageUrl` in POST |
| `src/app/api/admin/pages/[id]/route.ts` | Accept `featuredImageUrl` in PATCH |
| `src/app/api/admin/settings/route.ts` | Accept `typography` in PATCH |
| `src/app/(admin)/admin/pages/new/page.tsx` | Hero Image card |
| `src/app/(admin)/admin/pages/[id]/edit/page.tsx` | Hero Image card |
| `src/app/(admin)/admin/settings/page.tsx` | Typography card + 2FA policy descriptions |
| `src/components/marketing/page-hero.tsx` | **New** — shared hero component |
| `src/app/(marketing)/[slug]/page.tsx` | Render PageHero |
| `src/app/(marketing)/blog/[slug]/page.tsx` | Use PageHero |
| `src/lib/google-fonts.ts` | **New** — font list + URL builder (ported from theismlab) |
| `src/lib/typography.ts` | **New** — types, defaults, merge utility |
| `src/components/providers/organization-provider.tsx` | Add typography + contact fields |
| `src/components/providers/font-loader.tsx` | **New** — dynamic font/CSS var injection |
| `src/app/layout.tsx` | Include FontLoader |
| `src/components/blocks/contact-form-block.tsx` | Make dynamic (org context) |
| `src/lib/auth.ts` | Check twoFactorPolicy, add setup flag |
| `src/app/(portal)/layout.tsx` | Redirect if requiresTwoFactorSetup |
| `src/app/(admin)/admin/layout.tsx` | Redirect if requiresTwoFactorSetup |
| `src/components/settings/two-factor-setup.tsx` | Respect policy (hide/mandatory/optional) |
| `MANUAL.md` | Document all three features |

---

## Implementation Order

1. Schema changes (1A + 2A) → `prisma db push`
2. Feature 1: Page Heroes (1B → 1F)
3. Feature 2: Typography (2B → 2I)
4. Feature 3: 2FA Policy (3A → 3E)
5. Update MANUAL.md
6. Build, commit, push

---

## Verification

1. `npx prisma db push` succeeds
2. `npm run build` passes clean
3. Admin: create/edit page with hero image via MediaPicker
4. Public: non-homepage pages show 600px hero banner
5. Blog posts use same PageHero component
6. Homepage: no hero (blocks only)
7. Admin Settings: Typography card shows 5 categories with Google Fonts picker
8. Save typography → fonts load dynamically on public site via CSS variables
9. Contact form pulls address/email from org settings (not hardcoded)
10. 2FA Policy = "mandatory": user without 2FA is redirected to setup after login
11. 2FA Policy = "disabled": 2FA section hidden, login skips 2FA
12. 2FA Policy = "optional": current behavior preserved

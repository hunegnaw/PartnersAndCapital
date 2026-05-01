# Portal Visual Redesign — Design Only

## Context

Redesign the admin and client portal to match the reference design in `~/Downloads/pc_portal_complete.html`. This is a **visual-only** change — no new features, pages, or functionality. Just updating colors, typography, spacing, borders, and layout styling.

User instruction: "The blue should be the darkest blue in the header" — header uses `#1A2640`.

---

## Color Mapping (Current → Reference)

| Current | New | Semantic Name |
|---------|-----|---------------|
| `#0f1c2e` | `#1A2640` | pc-navy (header, buttons, hero sections) |
| `#b8860b` | `#B07D3A` | pc-gold (accent, links, avatar bg) |
| `#faf8f5` | `#f5f5f3` | bg2 (main content bg, hover states) |
| `#e8e0d4` | `#dfdedd` | border (card borders, dividers) — solid equivalent of `rgba(26,26,24,0.12)` |
| `#f5f0e8` | `#eeece8` | bg3 (count badges, dividers, progress bars) |
| `#4a4a4a` | `#5f5e5a` | text2 (sidebar text, secondary text) |
| `#9a8c7a` | `#888780` | text3 (muted text, section labels) |
| `#d4c5a9` | `#888780` | decorative dots → use text3 |
| `#1a1a1a` | `#1a1a18` | text1 (headings, primary text) |
| `#1e3a5f` | `#1A2640` | CSS primary var → pc-navy |
| `#2563eb` | `#185fa5` | CSS secondary var → blue-text |
| `#f59e0b` | `#B07D3A` | CSS accent var → pc-gold |
| `#6b7280` | `#5f5e5a` | body text → text2 |
| `#1a2d45` | `#2C3E5C` | navy hover → navy-mid |
| `#9a7209` / `#a07608` / `#a0750a` | `#7A5520` | gold hover → pc-gold-dark |
| `#dc2626` | `#a32d2d` | destructive → red-text |

Additional reference colors to introduce:
- `#FDF5E8` — gold-tinted bg for active admin sidebar items
- `#E8D5B0` — pc-gold-light for client sidebar active text
- `#7A5520` — pc-gold-dark for admin sidebar active text
- `#2C3E5C` — pc-navy-mid for client sidebar bg

---

## Phase 1: Central Theme (`globals.css`)

**File:** `src/app/globals.css`

Update `@theme inline` CSS custom properties:

```
--color-primary:              #1e3a5f  →  #1A2640
--color-secondary:            #2563eb  →  #185fa5
--color-accent:               #f59e0b  →  #B07D3A
--color-accent-foreground:    #1e3a5f  →  #1A2640
--color-foreground:           #171717  →  #1a1a18
--color-muted:                #f5f5f5  →  #f5f5f3
--color-muted-foreground:     #737373  →  #888780
--color-border:               #e5e5e5  →  #dfdedd
--color-destructive:          #dc2626  →  #a32d2d
```

Also update the `:root` oklch values to match. Update `--radius: 0.625rem` → `0.75rem` (12px per reference).

This single file change fixes all shadcn/ui components (Button, Card, Input, Badge, Table, etc.) at once.

---

## Phase 2: Client Portal Sidebar (white → navy-mid)

**File:** `src/app/(portal)/layout.tsx`

The biggest structural styling change. The client sidebar changes from white to navy-mid:

- Sidebar bg: `bg-white` → `bg-[#2C3E5C]`
- Remove right border (dark sidebar doesn't need it)
- Nav items: `text-[#4a4a4a]` → `text-white/55`
- Nav hover: `hover:text-[#b8860b] hover:bg-[#faf8f5]` → `hover:text-[#E8D5B0] hover:bg-white/5`
- Active state: gold-light text + gold left border + gold bg at 15%
- Section labels: `text-[#9a8c7a]` → `text-white/25` uppercase
- Dot indicators: `bg-[#d4c5a9]` → `opacity-60` on currentColor (or remove dots)
- Header: `bg-[#0f1c2e]` → `bg-[#1A2640]`
- Avatar: `bg-[#b8860b]` → `bg-[#B07D3A]`

---

## Phase 3: Admin Sidebar (stays white, refine styling)

**File:** `src/app/(admin)/admin/layout.tsx`

Admin sidebar stays white but gets refined active states:

- Header: `bg-[#0f1c2e]` → `bg-[#1A2640]`, add "Admin Portal" gold badge
- Nav items: `text-[#4a4a4a]` → `text-[#5f5e5a]`
- Active state: `text-[#7A5520] bg-[#FDF5E8] border-l-2 border-[#B07D3A]`
- Hover: `hover:text-[#7A5520] hover:bg-[#FDF5E8]`
- Section labels: `text-[#9a8c7a]` → `text-[#888780]`
- Count badges: `bg-[#f5f0e8]` → `bg-[#f5f5f3] text-[#888780]`
- Alert badges: `bg-[#FDF5E8] text-[#7A5520]`
- Main bg: `bg-[#faf8f5]` → `bg-[#f5f5f3]`

---

## Phase 4: Auth Layout

**File:** `src/app/(auth)/layout.tsx`

- Left panel: `bg-[#0f1c2e]` → `bg-[#1A2640]`

---

## Phase 5: Bulk Find-and-Replace Across All Files

Apply the color mapping table to every file with hardcoded hex values. Files affected:

**Portal pages:** dashboard, investments, investments/[id], documents, capital-activity, advisors, settings, support
**Admin pages:** dashboard, clients (+ subpages), investments (+ subpages), documents, advisors, activity, settings, admins, audit-log, notifications, blog (+ subpages), pages (+ subpages), media
**Auth pages:** forgot-password, reset-password, advisor-accept
**Marketing:** header.tsx, footer.tsx, blog/page.tsx, blog/[slug]/page.tsx
**Blocks:** all 13 block components + block-renderer
**Components:** rich-text-editor, media-picker, block-editor, block-type-picker, block-editor-form, date-picker, notification-bell
**Advisor:** advisor-shell.tsx, advisor pages
**Lib:** email-templates.ts, page-blocks.ts
**Other:** not-found.tsx, error.tsx, seed.ts, dashboard API route (allocation chart colors)

---

## Phase 6: Status Badge Colors (Reference Palette)

Update status pill/badge colors across all pages:

- Active/Green: `bg-[#eaf3de] text-[#3b6d11]`
- Performing/Blue: `bg-[#e6f1fb] text-[#185fa5]`
- Pending/Gold: `bg-[#FDF5E8] text-[#7A5520]`
- Error/Red: `bg-[#feecec] text-[#a32d2d]`

---

## Verification

1. `npm run build` passes with zero errors
2. Login page shows updated navy + gold colors
3. Client portal sidebar is navy-mid (`#2C3E5C`) with gold active states
4. Admin sidebar is white with gold-dark active states and `#FDF5E8` bg
5. All cards use updated border color
6. All text uses the new text1/text2/text3 hierarchy
7. Charts use updated gold stroke color
8. Marketing header/footer use updated colors
9. Commit and push

---

## Pre-requisite Fix: Login Redirect Loop

Before starting the redesign, fix the login bug in `src/app/page.tsx`. When no CMS homepage exists, authenticated users should redirect to their portal (not `/login`). Change lines 21-23 from:

```tsx
if (!homepage) {
  redirect("/login");
}
```

To role-based redirect for authenticated users, `/login` only for unauthenticated.

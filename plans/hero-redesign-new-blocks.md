# Plan: Hero Video Redesign + New Block Types

## Context

The homepage hero video block currently has a centered layout with basic heading/subheading/CTA. The user wants it redesigned to match a reference design (`~/Downloads/pc_website.html`) with:
- Left-aligned layout with staggered fadeUp animations
- Editable tagline, multi-line heading with `*italic*` gold text support, subtitle, two CTA buttons
- Dynamic investment stats pulled from the database (total deployed, avg net return, asset class count)
- Background effects (radial gradients, faint grid overlay) layered behind the video
- Gold divider line and scroll hint at bottom

Additionally, the other sections from the reference HTML should be added as new optional block types for the page builder:
- **Asset Cards** — 4-column grid of cards with hover effects (navy bg on hover)
- **Philosophy** — Quote with pillars sidebar
- **Process Steps** — Numbered steps with a sticky sidebar card
- **CTA Split** — Two-column CTA with bullet list on the right

---

## 1. Hero Video Block Redesign

### 1A. Add fadeUp keyframe to globals.css
**File:** `src/app/globals.css`

### 1B. Extend hero_video defaultProps
**File:** `src/lib/page-blocks.ts`
- Add: tagline, ctaText2, ctaUrl2, showStats, scrollHintText

### 1C. Public Stats API
**New file:** `src/app/api/stats/route.ts`
- Total Deployed, Avg Net Return (weighted by amountInvested), Asset Class Count

### 1D. Rewrite hero-video-block.tsx
- Left-aligned layout, staggered fadeUp animations, dynamic stats, gold divider, scroll hint

### 1E. Update block editor form — hero_video case
- Add all new fields to admin editor

---

## 2. New Block Types

### 2A. Asset Cards (`asset_cards`)
4-column grid with hover effects, tagline + heading + subtitle + repeatable cards

### 2B. Philosophy (`philosophy`)
Quote + pillars sidebar on navy background

### 2C. Process Steps (`process_steps`)
Numbered steps + sticky sidebar card with optional dynamic stats

### 2D. CTA Split (`cta_split`)
Two-column CTA with bullet list

---

## 3. Wiring Up
- Register in block-renderer.tsx
- Add editor cases in block-editor-form.tsx

## 4. Shared Utility
- `src/lib/parse-heading.tsx` — `*italic*` and line break parser

---

## Files Modified/Created
- `src/app/globals.css` — fadeUp keyframe
- `src/lib/page-blocks.ts` — hero_video extensions + 4 new block types
- `src/lib/parse-heading.tsx` — **New**
- `src/app/api/stats/route.ts` — **New**
- `src/components/blocks/hero-video-block.tsx` — Full rewrite
- `src/components/blocks/asset-cards-block.tsx` — **New**
- `src/components/blocks/philosophy-block.tsx` — **New**
- `src/components/blocks/process-steps-block.tsx` — **New**
- `src/components/blocks/cta-split-block.tsx` — **New**
- `src/components/blocks/block-renderer.tsx` — Register new blocks
- `src/components/admin/block-editor-form.tsx` — Update hero_video + add 4 new cases
- `MANUAL.md` — Document changes

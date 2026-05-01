# Show Nav Order + Drag-and-Drop Page Ordering

## Context
The admin pages list (`/admin/pages`) doesn't show the navigation order, and changing nav order requires editing each page individually. The user wants to see the nav order in the list and reorder pages via drag-and-drop.

## Changes

### 1. Add "Order" column to pages list table
**File:** `src/app/(admin)/admin/pages/page.tsx`
- Add `navOrder: number` to the `PageRecord` interface
- Add "Order" column header after "Nav" column — display `navOrder` value for pages with `showInNav: true`, "--" otherwise
- Sort pages by `navOrder asc` (nav pages first) instead of current `updatedAt desc` — API change handles this

### 2. Change API sort order for pages list
**File:** `src/app/api/admin/pages/route.ts`
- Change `orderBy: { updatedAt: "desc" }` to `orderBy: [{ navOrder: "asc" }, { title: "asc" }]` so the list reflects nav order

### 3. Add drag-and-drop reordering to pages table
**File:** `src/app/(admin)/admin/pages/page.tsx`
- Reuse existing `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (already installed, pattern in `block-editor.tsx`)
- Wrap the table body rows in `DndContext` + `SortableContext` with `verticalListSortingStrategy`
- Create a `SortableRow` component using `useSortable` hook — adds a grip handle icon (`GripVertical` from lucide) as first cell
- Add "drag handle" column as first column header
- On drag end: compute new `navOrder` values (array index), call `PATCH /api/admin/pages/reorder` with `[{ id, navOrder }]`, optimistically update UI

### 4. Add reorder API endpoint
**File:** `src/app/api/admin/pages/reorder/route.ts` (new file)
- `PATCH` handler accepting `{ pages: [{ id: string, navOrder: number }] }`
- Auth: `requireAdmin()`
- Batch update each page's `navOrder` in a transaction
- Audit log entry: `REORDER_PAGES`

### 5. Update MANUAL.md
- Note drag-and-drop reordering in the Page Builder section

## Verification
- Navigate to `/admin/pages` — see Order column, grip handles
- Drag a page row up/down — order updates immediately, persists on reload
- Check public site nav — order matches what admin set

## Key files
- `src/app/(admin)/admin/pages/page.tsx` — main list page
- `src/app/api/admin/pages/route.ts` — list API (sort order change)
- `src/app/api/admin/pages/reorder/route.ts` — new reorder endpoint
- `src/components/admin/block-editor.tsx` — existing dnd-kit pattern to replicate

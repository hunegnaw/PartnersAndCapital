# Two Column Block: Nested Content Blocks

## Context
Currently the Two Column block only supports rich text (HTML) in each column via `leftContent`/`rightContent` string fields. The user wants to be able to add any content block type (Contact Form, Text Section, Image, etc.) inside each column, just like adding blocks to the page itself.

## Approach
Store sub-blocks as arrays in the Two Column block's JSON `props` field (`leftBlocks` / `rightBlocks`). Each column gets a mini block editor in the admin UI with an "Add Block" button. The public renderer uses the same block components to render sub-blocks inside each column.

Backward compatible: existing Two Column blocks with `leftContent`/`rightContent` still render correctly.

## Files to Modify

### 1. `src/lib/page-blocks.ts`
- Update `two_column.defaultProps` to include `leftBlocks: []` and `rightBlocks: []`
- Add a `NESTABLE_BLOCK_TYPES` list that excludes `hero_video`, `hero_image`, and `two_column`

### 2. `src/components/admin/block-editor-form.tsx`
- Replace the `two_column` case: instead of two `RichTextField`s, render a mini sub-block editor for each column
- Each column shows its sub-blocks with expand/collapse, edit form, delete button, and an "Add Block" button
- Reuse `BlockEditorForm` recursively for editing each sub-block's props
- Reuse `BlockTypePicker` filtered to only `NESTABLE_BLOCK_TYPES`

### 3. `src/components/admin/block-type-picker.tsx`
- Accept an optional `allowedTypes` prop to filter which block types are shown

### 4. `src/components/blocks/two-column-block.tsx`
- Check for `leftBlocks`/`rightBlocks` arrays in props
- If present, render sub-blocks using block components
- Fall back to `leftContent`/`rightContent` HTML for backward compatibility

### 5. `src/components/blocks/block-renderer.tsx`
- Export `BLOCK_MAP` so `TwoColumnBlock` can reuse it for rendering nested blocks

## Block Types Allowed Inside Columns
- text_section, contact_form, newsletter_signup, quote, image, embed, spacer, stats, logo_gallery, cta_banner
- **Excluded**: hero_video, hero_image (full-width only), two_column (no infinite nesting)

## Data Shape
```json
{
  "leftWidth": "1/2",
  "leftBlocks": [
    { "id": "sub-1", "type": "contact_form", "props": { "heading": "Get in Touch" }, "sortOrder": 0 }
  ],
  "rightBlocks": [
    { "id": "sub-2", "type": "text_section", "props": { "content": "<p>Hello</p>" }, "sortOrder": 0 }
  ]
}
```

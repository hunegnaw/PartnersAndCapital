# Plan: Editable Footer + Global Color Picker with Saved Colors

## Context

Two features requested:

1. **Editable Footer** — The marketing footer is currently hardcoded with static text, colors, and layout. Make it configurable via admin UI with toggleable modules (logo, navigation, newsletter, contact info, tagline, copyright, disclaimer) and customizable colors.

2. **Global Color Picker with Saved Colors** — Every color input across admin settings and the page block editor is currently a plain hex text input. Replace them all with a proper color picker component that includes a native color picker, hex input, and a palette of saved/bookmarked colors that persist across the organization.

---

## Feature 1: Global Color Picker

### 1A. Schema — add `savedColors` to Organization
### 1B. Saved Colors API route
### 1C. SavedColorsProvider context
### 1D. ColorPicker component (native picker + hex + saved palette)
### 1E. ColorField wrapper for block editor
### 1F. Wire SavedColorsProvider in admin layout
### 1G. Replace 8 color inputs in admin settings
### 1H. Replace 5 color inputs in block editor

## Feature 2: Editable Footer

### 2A. Schema — add `footer Json?` to Organization
### 2B. Footer types, defaults, merge utility
### 2C. Settings API — accept `footer` in PATCH
### 2D. Organization provider — expose footer config
### 2E. Organization defaults — add footer
### 2F. Admin footer settings page (modules, logo, content, colors)
### 2G. Admin sidebar — add Footer link
### 2H. Rewrite footer component to be data-driven

See full plan details in Claude's plan file.

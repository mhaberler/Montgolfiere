# Montgolfiere UI Style Guide

Derived from `ScannerView.vue`. Apply these patterns across all views and components.

---

## Color Tokens

Defined in `src/assets/style.css` as CSS custom properties and mirrored as Tailwind utilities.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#2196f3` | Actions, links, navigation icons |
| `success` | `#4caf50` | Connected, resolved, tested, positive state |
| `warning` | `#ff9800` | Pending, unresolved, scanning, caution |
| `error` | `#f44336` | Failure, danger action, scan stop |

**Utility classes:** `text-{token}`, `bg-{token}`, `border-{token}`, `btn-{token}`

**Opacity modifiers** (Tailwind v4 slash syntax): `bg-success/10 text-success`, `bg-error/10 text-error`

---

## Page Shell

```html
<div class="w-full min-h-screen p-3 md:p-6 bg-gray-50">
```

- Mobile: `p-3`. Desktop breakpoint: `md:p-6`.
- Background: `bg-gray-50` (off-white, not pure white).

---

## Cards

### Primary / Featured Card

Used for the selected/preferred item. Larger, more prominent.

```html
<div class="mb-3 p-3 rounded-xl border-2 shadow-sm" :class="dynamicBorderClass">
```

- `rounded-xl` — more rounded than list items
- `border-2` — thicker border (state-driven color)
- `shadow-sm` — subtle lift
- Dynamic border/bg by connection state:
  - Connected: `border-success bg-green-50/50`
  - Trying: `border-warning bg-amber-50/50`
  - Idle: `border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50`

### List Item Card

Used in scrollable lists (pre-configured, discovered, manual).

```html
<div class="py-2 px-3 bg-white rounded border transition-all"
     :class="isPreferred ? 'border-2 border-amber-300 shadow-md' : 'border-gray-200 hover:border-blue-200'">
```

- `py-2 px-3` — compact vertical, slightly more horizontal padding
- `bg-white rounded border` — baseline
- `transition-all` — smooth hover/state changes
- Preferred: `border-2 border-amber-300 shadow-md`
- Default hover: `hover:border-blue-200`

### Form / Input Container

```html
<div class="mt-1 p-2 bg-white rounded-lg border border-gray-100">
```

- Lighter border (`border-gray-100`) than list items
- `rounded-lg` (vs `rounded` for list rows)

---

## Section Headers

Label groups of list items. Always above the first item in a section.

```html
<div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">
  Section Name
</div>
```

- `text-[10px]` — smallest readable size
- `font-bold uppercase tracking-wider` — allcaps label style
- `text-gray-400` — muted, de-emphasized
- `px-1` — slight indent to align with card content
- Top sections: `mb-1`. Subsequent sections: `mt-2 mb-1`

---

## Typography

| Role | Classes |
|------|---------|
| Card title / item name | `font-semibold text-sm text-gray-800 truncate` |
| Featured card title | `font-bold text-sm text-gray-800 break-words` |
| Monospace detail (host:port) | `text-[10px] text-gray-400 font-mono` |
| Type chip (WS/WSS/etc.) | `bg-gray-100 px-1.5 py-0.5 rounded text-[10px]` |
| Label text (checkbox, helper) | `text-xs text-gray-600` |
| Empty state | `text-sm text-gray-400` |
| Empty state sub-line | `text-xs mt-1 italic` |
| Warning / notice inline | `text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200` |

---

## Badges

Pill-shaped inline badges. All use `inline-flex items-center`.

```html
<!-- Source badge -->
<span class="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full text-white {bg-token}">
  Label
</span>

<!-- Tested / verified badge (with checkmark icon) -->
<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success text-white">
  &#10003; Tested
</span>
```

- Source colors: `bg-primary` (pre-configured), `bg-success` (discovered), `bg-warning` (manual)
- Always `text-white` on colored pill backgrounds

---

## Status Indicators

### Dot indicator (connection state)

```html
<div class="w-4 h-4 rounded-full {stateClass}"></div>
```

- Connected: `bg-success shadow-[0_0_6px_rgba(76,175,80,0.6)]` (glowing green)
- Trying: `bg-warning animate-pulse`
- Idle: `bg-gray-300`

### Tiny dot (resolved/pending, inline with text)

```html
<span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
      :class="resolved ? 'bg-success' : 'bg-warning animate-pulse'"></span>
```

---

## Buttons

All buttons use the `.btn` base class from `style.css` (`px-4 py-2 rounded-lg transition-colors font-medium`).

Override padding inline for compact buttons:

```html
<!-- Compact action button -->
<button class="btn text-xs py-1.5 px-3 btn-primary">Label</button>
<button class="btn text-xs py-1.5 px-3 btn-success">Label</button>
<button class="btn text-xs py-1.5 px-3 btn-warning">Label</button>
<button class="btn text-xs py-1.5 px-3 btn-danger">Label</button>

<!-- Destructive / secondary (ghost style) -->
<button class="btn text-xs py-1.5 px-3 bg-white hover:bg-red-50 text-red-600 border border-red-200">
  Remove
</button>

<!-- Neutral cancel -->
<button class="btn text-xs py-1.5 px-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200">
  Cancel
</button>

<!-- Full-width in button row -->
<button class="btn text-xs py-1.5 px-3 btn-warning flex-1">Test</button>
<button class="btn text-xs py-1.5 px-3 btn-primary flex-1">Open</button>
```

### Button row layout

```html
<div class="flex gap-2 mt-3">
  <!-- buttons here -->
</div>
```

---

## Icon Buttons

Round tap targets for inline row actions.

```html
<!-- Navigate / primary action -->
<button class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 text-primary">
  <svg class="w-4 h-4" .../>
</button>

<!-- Set preferred (star, unfilled) -->
<button class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 text-warning">
  <svg class="w-4 h-4" .../>
</button>

<!-- Preferred star (filled, non-interactive) -->
<span class="w-8 h-8 flex items-center justify-center rounded-full text-amber-500">
  <svg class="w-4 h-4" fill="currentColor" .../>
</span>

<!-- Destructive (remove) -->
<button class="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 text-red-400 hover:text-red-600">
  <svg class="w-4 h-4" .../>
</button>
```

All SVG icons: `w-4 h-4`, stroke-based except filled star.

---

## Form Inputs

```html
<!-- Text input -->
<input class="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary outline-none" />

<!-- Number input (fixed width) -->
<input type="number" class="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary outline-none" />

<!-- Select -->
<select class="px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-primary outline-none bg-white" />

<!-- Checkbox -->
<input type="checkbox" class="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary" />
```

Form row wraps with `flex flex-wrap gap-2`.

---

## Inline Feedback

Test result / status message shown below an action:

```html
<div class="mt-2 text-xs font-semibold px-2 py-1 rounded"
     :class="success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'">
  {{ message }}
</div>
```

Error banner (scan failure):

```html
<div class="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-xs border border-red-100">
  {{ error }}
</div>
```

---

## List Layout

```html
<div class="space-y-1">
  <!-- section header -->
  <!-- list items -->
</div>
```

Each list item uses CSS Grid for name/actions split:

```html
<div style="display: grid; grid-template-columns: 1fr auto; align-items: center;">
  <div style="min-width: 0">  <!-- text side, allows truncate -->
  <div class="flex items-center gap-1 flex-shrink-0">  <!-- actions side -->
```

---

## Modals / Popups

Bottom-sheet on mobile, centered on desktop. Matches card styling.

```html
<!-- Backdrop -->
<div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
     @click.self="closeModal">

  <!-- Sheet -->
  <div class="safe-bottom w-full max-w-sm overflow-hidden rounded-xl border-2 border-blue-200 bg-white shadow-2xl">

    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-100 px-3 py-2">
      <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Title</span>
      <button class="rounded px-1.5 py-0.5 text-lg leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700">×</button>
    </div>

    <!-- Body -->
    <div class="px-3 py-3">
      <!-- value display -->
      <div class="rounded-lg bg-gray-50 px-3 py-2 text-center">
        <div class="font-mono text-3xl font-bold text-blue-600">
          42 <span class="text-lg text-gray-500">m</span>
        </div>
      </div>

      <!-- actions -->
      <div class="mt-3 flex gap-2">
        <button class="btn text-xs py-1.5 px-3 btn-success flex-1">Confirm</button>
        <button class="btn text-xs py-1.5 px-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200">Cancel</button>
      </div>

      <!-- helper text -->
      <p class="mt-2 text-[10px] text-gray-400">Descriptive note here.</p>
    </div>
  </div>
</div>
```

- `max-w-sm` — narrower than full screen on tablet
- `rounded-xl border-2` — matches featured card
- Use `Teleport to="body"` + `overflow: hidden` on body when open

---

## Spacing Conventions

| Context | Value |
|---------|-------|
| Page padding mobile | `p-3` |
| Page padding desktop | `md:p-6` |
| Card internal padding (featured) | `p-3` |
| Card internal padding (list row) | `py-2 px-3` |
| Between list items | `space-y-1` |
| Between sections | `mt-2` above header |
| Between header and first item | `mb-1` |
| Button row gap | `gap-2` |
| Icon button size | `w-8 h-8` |
| Icon svg size | `w-4 h-4` |

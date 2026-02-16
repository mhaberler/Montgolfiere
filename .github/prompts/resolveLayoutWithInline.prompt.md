---
name: resolveLayoutWithInline
description: Fix layout alignment issues in Vue components using inline styles when CSS classes fail.
argument-hint: The component file path and description of the layout problem (e.g., elements stacking incorrectly)
---

# Resolve Layout Issues with Inline Styles

When CSS class-based layouts aren't applying in Vue components (likely due to scoping, specificity, or Tailwind conflicts), use inline `style` attributes as a direct, high-specificity override.

## Problem Identification
- Elements are stacking or misaligning despite correct CSS classes
- Flex or grid properties don't seem to be taking effect
- The issue persists across multiple CSS rewrite attempts

## Solution Approach
1. Identify the container element that needs layout control (e.g., a row or list item)
2. Remove problematic class-based layout utilities (e.g., `class="flex justify-between"` or `class="grid grid-cols-..."`)
3. Apply layout directly via inline styles: `style="display: grid; grid-template-columns: 1fr auto; align-items: center;"`
4. For child elements that need size constraints, add `style="min-width: 0;"` to prevent overflow/wrapping
5. Test to confirm buttons/elements now appear side-by-side at proper vertical alignment

## Example Fix Pattern
```vue
<!-- Before: CSS classes not working -->
<div class="broker-row" :class="{ highlight: isActive }">
  <div class="flex flex-col gap-0.5">Content</div>
  <div class="flex items-center gap-1">Actions</div>
</div>

<!-- After: Inline styles -->
<div class="broker-row" :class="{ highlight: isActive }"
     style="display: grid; grid-template-columns: 1fr auto; align-items: center;">
  <div style="min-width: 0;">Content</div>
  <div>Actions</div>
</div>
```

## Why This Works
- Inline styles have the highest CSS specificity
- They bypass scoped style limitations in Vue SFCs
- Grid layout guarantees proper alignment without flex wrapping issues
- `min-width: 0` on grid children prevents content overflow and wrapping

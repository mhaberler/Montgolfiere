---
name: migrateCssToTailwind
description: Systematically migrate component CSS to Tailwind utilities while preserving necessary styles
argument-hint: Optional - specific components, directories, or scope to focus on
---

# Task: Migrate CSS to Tailwind Utilities

Analyze the current project and systematically convert traditional CSS (scoped, module, or global) to Tailwind utility classes.

## Discovery Phase
1. **Audit current state:**
   - Verify Tailwind installation and version
   - Identify all components using traditional CSS
   - Quantify total CSS lines and conversion scope
   - Note any design system integration (Material, Ionic, Bootstrap, etc.)

2. **Identify constraints:**
   - CSS that cannot be converted to Tailwind (animations, complex gradients, pseudo-elements, media queries)
   - Framework-specific styling requirements
   - Dynamic class patterns that need safelisting
   - Build tool configuration (Vite, Webpack, etc.)

## Planning Phase
3. **Create conversion strategy:**
   - Prioritize components by complexity (simple utility-replaceable CSS first)
   - Group related components with shared patterns
   - Plan theme configuration for design system token mapping
   - Define validation checkpoints (type checks, builds)

4. **Configure Tailwind theme:**
   - Map design system tokens/variables to Tailwind theme
   - Add safelist for dynamic class patterns
   - Configure custom variants if needed
   - Set up purge/content paths correctly

## Implementation Phase
5. **Convert components systematically:**
   - Replace CSS properties with Tailwind utilities
   - Convert dynamic classes from template literals to object syntax
   - Remove scoped/module CSS blocks where fully replaced
   - Preserve CSS for animations, complex effects, pseudo-elements
   - Document preserved CSS with comments explaining why

6. **Handle special cases:**
   - **Animations:** Keep @keyframes as CSS with explanatory comments
   - **Complex gradients/effects:** Preserve backdrop-filter, multi-layer shadows, gradients
   - **Pseudo-elements:** Keep ::before/::after with CSS positioning/content
   - **SVG styling:** Dynamic SVG elements may need CSS selectors
   - **Media queries:** Complex responsive logic may stay as CSS

7. **Validate continuously:**
   - Run type checks after each batch of conversions
   - Build project to verify Tailwind purging works correctly
   - Test dynamic class generation in runtime
   - Verify design system integration remains functional

## Output
- Report conversion statistics (lines removed, components converted)
- List any remaining CSS with justification
- Confirm build/type validation passes
- Note any optional follow-up work

## Notes
- Bias toward Tailwind utilities but don't force it for CSS that doesn't translate well
- Maintain code readability - use semantic class groupings
- Follow framework conventions for dynamic class bindings
- Test that all dynamic classes are properly safelisted

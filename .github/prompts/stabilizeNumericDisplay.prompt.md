---
name: stabilizeNumericDisplay
description: Stabilize numeric value display so the layout doesn't shift when values change sign.
argument-hint: The selected code containing a numeric value display element
---
Analyze the selected code that displays a numeric value and fix layout instability caused by sign changes (e.g., positive to negative).

Apply these techniques:

1. **Separate sign from digits**: Split the formatted value into a sign character and an absolute value so they can be styled independently.
2. **Fixed-width sign slot**: Render the sign character inside a fixed-width inline-block element (e.g., `width: 0.6em`, right-aligned) so it occupies the same space whether present or not.
3. **Compensate centering offset**: Shift the entire value left by half the sign-slot width (e.g., `margin-left: -0.3em`) so the digits remain visually centered.
4. **Use tabular figures**: Apply `font-variant-numeric: tabular-nums` (or equivalent utility class) so all digits occupy equal width.
5. **Handle non-numeric values separately**: Use conditional rendering so non-numeric values (strings, placeholders like `--`) display without the sign slot or margin offset.

Use a proper Unicode minus sign (`U+2212`) instead of a hyphen for the negative sign.

Ensure the fix is minimal and doesn't affect surrounding layout or unrelated styles.

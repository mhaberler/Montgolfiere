---
name: addPrecisionControl
description: Add per-entry decimal rounding to numeric values scaled by a factor field.
argument-hint: The file or data structure containing numeric definitions with a scaling factor.
---
Analyze the specified code for numeric values that are scaled by a factor (e.g., `value *= factor`) but lack rounding, causing floating-point artifacts.

Implement per-entry precision control using this approach:

1. **Auto-derive decimals from factor**: Compute `Math.ceil(-Math.log10(factor))` to infer the number of meaningful decimal places (e.g., factor `0.01` → 2 decimals, `0.001` → 3 decimals).
2. **Add an optional `decimals` override field** to the definition interface/type so individual entries can specify a different rounding than the auto-derived default.
3. **Apply rounding unconditionally** using: `decimals = entry.decimals ?? (entry.factor ? Math.ceil(-Math.log10(entry.factor)) : 0)` followed by `Number(value.toFixed(decimals))`.
4. **Add one example entry** with an explicit `decimals` override and a brief comment explaining the mechanism.

Constraints:
- Minimize changes to existing data entries — the auto-derivation should produce correct results for nearly all existing entries without modification.
- Keep the rounding logic in one place, close to where the factor is applied.
- Run a type-check after changes.

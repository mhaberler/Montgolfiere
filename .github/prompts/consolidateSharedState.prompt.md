---
name: consolidateSharedState
description: Consolidate scattered instances of a custom composable into a centralized module.
argument-hint: The name of the custom composable pattern being scattered (e.g., usePersistedRef, useCustomHook)
---

# Consolidate Shared State Composables

Your codebase has the same custom composable pattern ([pattern name]) used across multiple files with intermediate re-exports and re-declaration. Consolidate them into a single source of truth.

## Steps

1. **Survey usage**: Search the codebase to find all files importing or using [pattern name]. Document which files create instances and which re-export them.

2. **Create centralized hub**: Create a new module (or expand an existing one) that consolidates all instances of [pattern name] as direct exports, organized into logical sections with clear comments.

3. **Update consumers**: Update all files that imported from intermediate locations to instead import directly from the centralized hub.

4. **Remove intermediaries**:
   - Delete or simplify any re-export files that were passing through [pattern name]
   - Update imports in files that were using the intermediate re-exports

5. **Clean up aggregator modules**: In any module that aggregates module exports (like a global state module), remove re-exports of variables now available from the centralized hub.

6. **Fix stray imports**: Search for any remaining imports from old paths and update to the new centralized location.

7. **Verify**: Run the build and ensure no import errors or missing exports.

## Best Practices

- Organize exports into logical sections with descriptive comments
- Use consistent import path style across the codebase (@/ aliases vs relative paths)
- Group related constants together
- Document the purpose of each exported variable
- Update type exports if adding new types alongside instances

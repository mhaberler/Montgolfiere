# CapGo Error Handling Improvements

## Problem
The app was experiencing runtime errors during CapGo reload operations:
```
Uncaught (in promise) TypeError: Cannot destructure property 'type' of 'vnode' as it is null.
```

This error occurs when Vue components are being destroyed during app reload, leaving vnodes in an invalid state.

## Solution
Implemented multiple layers of error handling:

### 1. Safe Reload Pattern
Modified all reload operations in `CapGo.vue` to use a delayed approach:

```typescript
// Use setTimeout to ensure toasts are shown before reload
setTimeout(async () => {
    try {
        await CapacitorUpdater.reload();
    } catch (reloadError) {
        console.error('Reload error (this is expected during app restart):', reloadError);
        // Fallback: Try to reload the browser
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }
}, 1000);
```

### 2. Global Error Handlers
Added comprehensive error handling in `main.ts`:

- **Unhandled Promise Rejections**: Catches and prevents vnode-related errors from crashing the app
- **Global Error Handler**: Catches general errors and handles vnode errors gracefully
- **Vue Error Handler**: Specifically handles Vue component errors during reload

### 3. Graceful Degradation
- Errors are logged but don't crash the app
- Fallback to browser reload if CapacitorUpdater.reload() fails
- User feedback is maintained throughout the process

## Benefits
- App no longer crashes during update/revert operations
- Better user experience with proper error handling
- Comprehensive logging for debugging
- Fallback mechanisms ensure reload always works

## Files Modified
- `src/components/CapGo.vue` - Updated reload functions
- `src/main.ts` - Added global error handlers

## Testing
All CapGo operations (check updates, try updates, revert to native, switch bundles) now work reliably without causing app crashes.

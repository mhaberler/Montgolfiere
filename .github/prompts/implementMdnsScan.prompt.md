---
name: implementZeroConf
description: Implement ZeroConf  Scanning Feature with preferred selection, persistent state, and visual feedback
argument-hint: feature requirements or specification file (optional)
---

# Implement ZeroConf with Preferred Selection

Review the provided requirements or specification and implement a comprehensive ZeroConf scanner feature with the following components:

## Core Functionality

1. **Goal**
   - Create a reusable Vue Single Page Component as a ion-card

1. **Preferred Selection**
   - Add always-visible button to mark one item as "preferred" from a list of available options
   - Button text: "select" for non-preferred items, "unselect" to unset preferred status
   - Store select choice persistently (usepersistedref)
   - Only allow one selected item at a time
   - Provide clear visual indication of which item is preferred (e.g., Background color. )

2. **Persistent Toggles**
   - Implement toggle controls (e.g., "Auto Scan") with persistent state
   - Save toggle state to storage and restore on app restart
   - Disable dependent toggles when prerequisites aren't met
   - Add appropriate visual feedback for disabled states

3. **Smart Matching & Status**
   - Create matching logic to find preferred item among available options
   - Implement status indicators (e.g., "Found", "Searching", "Not found")
   - Use computed properties for reactive status updates
   - Add appropriate fallback strategies if exact match fails

4. **Visual Feedback**
   - Design prominent card/banner to display preferred item with status badge
   - Add visual highlighting (e.g., colored border/outline) to preferred item in lists
   - Use color coding for different states (green=found, orange=searching, red=not found)
   - For non-preferred items: allow click-anywhere or explicit button based on UX needs

5. **Automatic Navigation & Connection**
   - Automatically navigate to detail/connection view when conditions are met
   - Initiate connection immediately upon view entry
   - Watch for status changes and trigger auto-connect when preferred item becomes available
   - Implement intelligent timeout handling with user feedback

6. **State Management Across Views**
   - Disable auto-connect toggle when navigating back to prevent reconnection loops
   - Preserve other persistent settings appropriately
   - Clean up resources on unmount/navigation

## Implementation Guidelines

- Follow existing code patterns and architecture
- Use reactive state management (computed properties, watchers)
- Add comprehensive error handling with user-friendly messages
- Include documentation comments explaining edge cases
- Test all toggle combinations and state transitions
- Ensure responsive design for mobile and desktop
- Use clear, action-oriented button labels ("Prefer", "Default", "Connect")
- Distinguish button states visually (e.g., gold for selected, blue for available)
- Prevent accidental actions by requiring explicit button clicks for important operations

## Expected Deliverables

- Storage utility functions for persistent state
- Updated UI components with toggles and visual indicators
- Matching/search logic with status computation
- Auto-connect behavior with proper timing and navigation
- Clean state management across view transitions

I wish I could motivate you to work on zeroconf resolution of the MQTT broker host name/service
This will cover the autonomous scenario where the broker is connected to the hotspot of the mobile.


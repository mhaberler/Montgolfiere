Legacy Montgolfiere airspace implementation quarantined on 2026-04-12.

Removed from the live source tree:

- src/map/openaip.ts
- src/map/airspaceStack.ts
- src/assets/airspace-map.css

Active replacements:

- src/composables/airspace/useOpenAIP.ts
- src/airspace/airspaceStack.ts
- src/assets/airspace-import.css
- src/components/airspace/AirspaceMap.vue
- src/components/airspace/AirspaceStack.vue
- src/views/MapPage.vue

If parts of the previous implementation are needed again, recover them from git history rather than restoring files into src/map.

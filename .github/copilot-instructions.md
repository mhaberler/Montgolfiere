# Project Guidelines

## Code Style
- Prettier settings: single quotes, no semicolons, print width 100; config in [.prettierrc.json](.prettierrc.json).
- TypeScript + Vue 3 Composition API; follow component patterns in [src/views/Tab1Page.vue](src/views/Tab1Page.vue) and [src/components/units/UnitsTable.vue](src/components/units/UnitsTable.vue).
- Formatting command: `npm run format`.

## Architecture
- Data flow: BLE scan in [src/sensors/blesensors.ts](src/sensors/blesensors.ts) -> decode in [src/decoders/](src/decoders/) -> mapping in [src/composables/useDeviceMapping.ts](src/composables/useDeviceMapping.ts) -> UI.
- EKF/physics logic for altitude/velocity is centralized in [src/process/pressure.ts](src/process/pressure.ts).
- Full rationale and system overview in [CLAUDE.md](CLAUDE.md).

## Build and Test
- Install: `npm install` (or `bun install`).
- Dev server: `npm run dev`.
- Type check: `npm run watch` or `npx vue-tsc --noEmit`.
- Build: `npm run build-dev` / `npm run build-prod`.
- Unit tests: `npx vitest` (see [tests/unit/](tests/unit/)).
- E2E tests: `npx cypress run` (see [tests/e2e/](tests/e2e/)).
- Capacitor sync: `npm run sync`.

## Project Conventions
- Use composables for shared logic; see [src/composables/useDeviceMapping.ts](src/composables/useDeviceMapping.ts) and [src/composables/usePersistedRef.ts](src/composables/usePersistedRef.ts).
- Decoders return standardized metric keys (`temp`, `hum`, `batpct`, `percent`, `level`, `pressure`, `voltage`); add new decoders under [src/decoders/](src/decoders/) and wire them in [src/sensors/blesensors.ts](src/sensors/blesensors.ts).
- Persist user/device mappings with `usePersistedRef` and apply the reactive timestamp pattern for age/status (documented in [CLAUDE.md](CLAUDE.md)).
- Treat EKF updates in [src/process/pressure.ts](src/process/pressure.ts) as sensitive: add tests with conservative tolerances.

## Integration Points
- Capacitor plugins and native settings: [capacitor.config.ts](capacitor.config.ts), [android/](android/), [ios/](ios/).
- MQTT runtime config uses `VITE_` env vars in [src/utils/mqtt.ts](src/utils/mqtt.ts).
- Deployment and signing via fastlane in [fastlane/README.md](fastlane/README.md).

## Security
- Do not commit secrets; `.env*` and signing files are ignored (see .gitignore).
- Keystore and fastlane credentials come from environment variables; see [capacitor.config.ts](capacitor.config.ts) and [fastlane/README.md](fastlane/README.md).
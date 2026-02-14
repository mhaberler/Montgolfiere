# Montgolfiere — AI / Copilot instructions

Short goal
- Make small, well-tested edits; prefer minimal, reviewable PRs that preserve runtime behaviour.
- When in doubt, follow patterns in `CLAUDE.md` and existing files listed below.

## Code style
- Formatting: `prettier` with `.prettierrc.json` (singleQuote: true, semi: false, printWidth: 100). Run `npm run format` before committing. ✅
- TypeScript + Vue 3 Composition API. Use `vue-tsc` for type checks (`npm run watch` or `npx vue-tsc --noEmit`).
- Linting: ESLint config exists (`@vue/eslint-config-typescript`). Run `npx eslint .` if needed.

## Architecture (quick reference)
- Data flow: `BLE sensors -> src/sensors/blesensors.ts -> src/decoders/* -> src/composables/useDeviceMapping.ts -> UI`.
- Key files to inspect before changing behaviour: `src/sensors/blesensors.ts`, `src/decoders/`, `src/composables/useDeviceMapping.ts`, `src/process/pressure.ts`, `src/views/Tab1Page.vue`, `src/components/units/UnitsTable.vue`.
- See `CLAUDE.md` for full architecture and design rationale.

## Build & test (commands agents will use)
- Install: `npm install` (or `bun install`).
- Dev server: `npm run dev` (Vite).
- Type check: `npm run watch` (vue-tsc --watch) or `npx vue-tsc --noEmit`.
- Build: `npm run build-dev` / `npm run build-prod`.
- Mobile run / debug: `npm run debug-ios-i16`, `npm run debug-android-a15`.
- Sync Capacitor: `npm run sync`.
- Format: `npm run format`.
- Unit tests: `npx vitest` (tests in `tests/unit/`).
- E2E: `npx cypress run` (tests in `tests/e2e/`).

## Project conventions (must-follow)
- Use composables for shared logic (`src/composables/*`). Example: `useDeviceMapping`, `usePersistedRef`.
- Decoders must return standardized metric names (`temp`, `hum`, `batpct`, `percent`, `level`, `pressure`, `voltage`) — add new parsers under `src/decoders/` and update `src/sensors/blesensors.ts`.
- Persist user/device mappings via `usePersistedRef` (see `src/composables/usePersistedRef.ts`).
- Use the reactive timestamp pattern for age/status calculations (see `CLAUDE.md`).
- EKF / physics logic lives in `src/process/pressure.ts` — changes here require tests and conservative numeric tolerances.

## Adding new BLE sensor support (step-by-step)
1. Add manufacturer ID / service UUID to `allowedManufacturerIds` / `allowedServiceUUIDs` in `src/sensors/blesensors.ts`.
2. Implement parser in `src/decoders/<vendor>.ts` returning standardized metric names.
3. Add case in `decodeSensor()` and update types in `src/types/`.
4. Add unit tests for decoder and an integration test for `useDeviceMapping`.

## Integration points & environment
- Capacitor plugins (BLE, barometer, camera, etc.) — native config in `capacitor.config.ts` and `android/`, `ios/` directories.
- Deployment & signing: `fastlane/` — use existing lanes (`ios beta`, `android beta`).
- MQTT: runtime config in `src/utils/mqtt.ts` — values come from `VITE_` env vars.
- Environment: `vite` uses `import.meta.env`; `.env*` files are ignored by git.

## Security & secrets
- Never commit secrets. `.env` files and keystore files are in `.gitignore`.
- Keystore & Fastlane credentials are read from environment variables (see `capacitor.config.ts` and `fastlane/README.md`).
- For iOS certs use `fastlane match` as configured.

## Tests & PR expectations
- Small, focused PRs with changelog-style commit messages.
- Add unit tests for any decoder, filter, or EKF change; prefer deterministic inputs.
- Run `npm run format` and type-check before opening PR.

---
If anything here is unclear or you want more detail about a specific area (decoders, EKF, BLE scanning), tell me which section to expand.  
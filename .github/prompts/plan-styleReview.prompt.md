# Style Review — Montgolfiere

## 1. Formatting hasn't been enforced

The Prettier config says single quotes + no semicolons, but a large portion of files (all decoders, blesensors.ts, useDeviceMapping.ts) use double quotes and semicolons. A single `npm run format` would fix this — the real question is why it isn't in a pre-commit hook.

## 2. The unit components are 80% copy-paste

EnvelopeUnit.vue, BoxUnit.vue, OATUnit.vue, and VarioUnit.vue are near-identical. Each duplicates:
- `formatMetricName` / `formatMetricValue` / `getMetricAgeClass` / `getMetricReadings` — with *subtly different* format maps (e.g., EnvelopeUnit formats temp as `24.5°C`, UnitsTable as `24.5°`)
- A `setInterval` for the reactive timestamp (duplicated 8+ times across the app)
- The same template structure with different hardcoded unit names and icons

TankUnit.vue already takes `unitType` as a prop — the others should follow the same pattern, or better yet, be a single `GenericUnit.vue` component.

## 3. `any` at the heart of the data flow

`decodedValue: any` in UnitSensorData and `decoded: Record<string, any>` in ExtendedScanResult mean every decoder's output is untyped from the moment it enters the system. Each decoder already has a well-defined interface (`RuuviData`, `MopekaData`, etc.) — a discriminated union would give compile-time safety without runtime overhead:

```typescript
type DecodedSensorData =
  | { type: 'ruuvi'; data: RuuviData }
  | { type: 'mopeka'; data: MopekaData }
  | ...
```

## 4. Re-export chains obscure state origin

State is defined in useAppState.ts but then re-exported through pressure.ts, qnh.ts, mqtt.ts, startup.ts, and useDemUrl.ts (which is literally a one-line re-export). When I want to know where `transitionAltitude` lives, I have to trace through two hops. Import directly from `useAppState` everywhere and delete the intermediate re-exports.

## 5. Two component styles coexist

MQTTClientView.vue and ScannerView.vue use `defineComponent()` + `setup()`, while every other component uses `<script setup>`. Similarly, LinearScale.vue and ValueCard.vue lack `lang="ts"`. Standardize to `<script setup lang="ts">` everywhere.

## 6. Map reactivity is fragile

In blesensors.ts, when a known device sends a new advertisement, the code does `const exists = devices.value.get(id)` then mutates `exists.lastSeen`, `exists.decoded`, etc. Vue doesn't track deep mutations inside Map values — watchers/computeds on `devices` won't reliably fire. This works today because the UI polls on `setInterval`, but it's a latent bug if anyone adds a `watch(devices, ...)`.

## 7. Commented-out code as version control

~60 lines of commented-out cleanup functions in blesensors.ts, a commented-out toast import, a commented-out `console.log` in Tab1Page, leftover `// <-- ADD` diff markers in useMqttConnection.ts, and a commented-out type annotation in mqtt.ts. That's what git is for.

## 8. Naming issues

- **Typos in identifiers**: `altiudeVarianceHistory` in kalman.ts (altitude), `elevationABoveTakeoff` in Tab1Page.vue, `resetbleScanTimeouts` in blesensors.ts (should be `resetBleScanTimeouts`), `vspeedstandardDeviation` / `vaccelstandardDeviation` in kalman.ts
- **`Tab1Page` / `Tab2Page`**: Generic numbered names for what are really `FlightStatusPage` and `BLEScannerPage`
- **`parseMystery`**: The decoder name gives zero information about the sensor; even comments only hint at "ELG"
- **Decoder type strings** don't match BLE scanner labels: decoders return `"ruuvi"`, `"tpms"`, `"elg"` (lowercase) while `allowedManufacturerIds` uses `"Ruuvi"`, `"TPMS1"`, `"Rotarex"` (mixed case)

## 9. Magic numbers scattered in views

ISA reference pressure `1013.25` appears as a literal in three places. Conversion factors `3.6` (m/s→km/h) and `3.28084` (m→ft) are inline. Age thresholds (`10000`, `30000`, `60000` ms) are hardcoded differently in each unit component versus `SENSOR_STATUS_THRESHOLDS` in useDeviceMapping. These should be named constants, and ideally the age thresholds in components should derive from the same source as the status thresholds.

## 10. DOM manipulation in Vue

TabsPage.vue uses `document.querySelector('#tab-bar')` to show/hide the tab bar. In Vue, this should be a reactive binding (`:style` or `v-show`) that responds to state, not imperative DOM manipulation.

---

## What to preserve

- **`ref()` everywhere instead of `reactive()`** — consistent and simple
- **Centralized persisted state in `useAppState.ts`**
- **`usePersistedRef` / `usePersistedRefWithTimestamp`** — elegant with good JSDoc
- **Decoder-per-protocol file structure** — clear and extensible
- **The stats library** (`RunningStats`, `CircularBuffer`, etc.) — well-typed, focused classes
- **Singleton composable patterns** (`useAppLifecycle`, `useMqttConnection`)

# Heading Jump Issue (Android, Samsung S24)

## Symptom
Heading jumps erratically (e.g. 60° → 310° → 60°) during flight on Android.

## Root Cause
`Tab1Page.vue` displays `location?.coords?.heading` — this is **GPS course-over-ground**,
not magnetometer/compass heading (confirmed via `formatHeading()`,
[Tab1Page.vue:46](src/views/Tab1Page.vue#L46)).

Course-over-ground is derived from consecutive GPS fixes' bearing. At low horizontal
speed (balloon near-stationary: launch, calm air, hover), this bearing calculation is
dominated by positional noise and becomes unreliable — producing random jumps,
including near-180° flips. This is a physical limitation of GPS-course heading, not a
compass calibration bug.

## Contributing Factor (code-level)
[src/sensors/location.ts](src/sensors/location.ts) uses **two independent, unsynchronized
location sources** writing to the same `location.value`:

1. `Geolocation.watchPosition()` callback — [location.ts:134-148](src/sensors/location.ts#L134-L148)
2. A 2-second polling `Geolocation.getCurrentPosition()` loop, Android-only —
   [location.ts:167-177](src/sensors/location.ts#L167-L177), started at
   [location.ts:151-153](src/sensors/location.ts#L151-L153)

Each fix can come from Android's fused location provider with independently-derived
heading values. Interleaving two uncoordinated sources compounds the noise and
increases jump frequency/severity beyond plain low-speed GPS-course noise.

## Suggested Fixes (not yet implemented)
- Speed-gate heading display: hold/gray out heading below a min ground speed threshold
  (e.g. < 0.5–1 m/s) instead of showing noisy course.
- Remove or reconcile the dual-source polling — prefer a single location stream, or
  explicitly pick freshest/most-accurate fix rather than blind overwrite.
- Optionally smooth heading with a circular-mean low-pass filter (careful with 0°/360°
  wraparound) rather than raw last-fix value.

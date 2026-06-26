# BM6 BLE Battery Monitor — Design Plan (Paused)

**Status:** Paused after Q1 (integration model). Resume with `/grill-with-docs` or `@docs/plans/bm6-ble-sensor.md`.

**Goal:** Add support for [BM6 battery monitors](https://github.com/JeffWDH/bm6-battery-monitor) as a new BLE sensor type. **Phase 1:** log decoded readings to console only — no UI, no unit mapping.

---

## Why BM6 Is Different

All current Montgolfiere BLE sensors are **passive advertisement decoders** (`src/sensors/blesensors.ts` → `decodeSensor()`). Ruuvi, Mopeka, TPMS, etc. broadcast telemetry in the ad packet.

BM6 requires an **active GATT session** ([reference script](https://github.com/JeffWDH/bm6-battery-monitor/blob/main/bm6-battery-monitor.py)):

1. Discover device with name `"BM6"`
2. Connect via GATT
3. AES-CBC encrypt command `d1550700000000000000000000000000` with fixed 16-byte key
4. Write encrypted payload to characteristic `FFF3`
5. Subscribe to notifications on `FFF4`
6. Decrypt notification payload → voltage (V), temperature (°C), SoC (%)

The codebase has **no existing GATT connect/write/notify pattern** — only `BleClient.requestLEScan()`.

### Protocol constants (from reference)

| Item | Value |
|------|-------|
| Device name | `BM6` |
| AES key | `[108, 101, 97, 103, 101, 110, 100, 255, 254, 48, 49, 48, 48, 48, 48, 57]` |
| AES mode | CBC, IV = 16 × `0x00` |
| Write char | `FFF3` |
| Notify char | `FFF4` |
| Start command (plaintext) | `d1550700000000000000000000000000` |
| Valid notification prefix | `d15507` (hex after decrypt) |
| Voltage | bytes 15–17 of hex string → int / 100 |
| SoC | bytes 12–13 → int |
| Temperature | byte 6 = `01` → negative; else positive; magnitude from bytes 8–9 |

Further reading: [BM2 reverse engineering](https://doubleagent.net/bm2-reversing-the-ble-protocol-of-the-bm2-battery-monitor/), [KrystianD docs](https://github.com/KrystianD/bm2-battery-monitor/blob/master/.docs/reverse_engineering.md).

---

## Decided

### Q1 — Integration model → **Option A: Sidecar module**

New module (proposed: `src/sensors/bm6.ts` or `src/sensors/bm6Connection.ts`):

- Scan callback detects `device.name === "BM6"`
- Triggers connect → encrypt → write → notify → decrypt → `console.log`
- **Does not** go through `decodeSensor()`, `useDeviceMapping`, or Settings UI in phase 1
- Wired from `startup.ts` lifecycle (foreground start / background stop), same as other sensors

**Rejected for now:**

- **B** — Fold into passive scan pipeline (misleading; ads alone carry no telemetry)
- **C** — Pause scan while connected (mobile scan+connect contention; unnecessary for phase 1)

---

## Open Questions (resume grill here)

1. **Discovery filter** — Match on device name `"BM6"` only, or also service UUIDs / MAC allowlist?
2. **Polling cadence** — Connect-on-demand per reading vs. maintain one persistent connection vs. periodic reconnect (e.g. every 60s)?
3. **Multi-device** — One BM6 or several? If several, serial connect or parallel (likely serial on mobile BLE stack)?
4. **Scan coexistence** — Run sidecar alongside existing passive scan, or dedicate a scan window? (Recommend: coexist; verify on real hardware.)
5. **Crypto dependency** — Web Crypto API vs. small AES library (Capacitor WebView AES-CBC support needs verification)?
6. **Phase 2 mapping** — Which balloon unit? (`Box` for vehicle battery is the obvious candidate.)
7. **Metric names** — `voltage`, `temp`, `soc` / `batpct` alignment with existing decoder conventions.
8. **Status thresholds** — BM6 is polled, not broadcast; thresholds differ from Ruuvi/Mopeka model.
9. **Settings UX** — Manual address entry vs. auto-discover only; persist selected BM6 device ID?

---

## Phase 1 Implementation Sketch (when resumed)

```
src/
├── decoders/bm6.ts          # parseDecryptedPayload(hex) — pure decode, no BLE
├── sensors/bm6.ts           # connect, encrypt, write, notify, log; AES helpers
└── utils/startup.ts         # startBm6Polling() / stopBm6Polling() on lifecycle
```

Console output example:

```
BM6 [AA:BB:CC:DD:EE:FF] voltage=12.84V temp=23C soc=87%
```

**Out of scope for phase 1:** UI, unit table, device assignment, MQTT publish, type definitions in Settings.

---

## Notes

- Standard `.github/prompts/addBleSensorDecoder.prompt.md` assumes advertisement decoders; BM6 needs a separate prompt or an appendix for connection-based sensors.
- No `CONTEXT.md` created yet — domain terms (e.g. sidecar vs. passive sensor) can be added when implementation starts.

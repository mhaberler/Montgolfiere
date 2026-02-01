# Montgolfiere - Hot Air Balloon Flight Monitoring System

## Project Overview

Montgolfiere is an Ionic/Vue 3/Capacitor mobile application for iOS and Android that provides real-time monitoring of hot air balloon systems during flight. The app collects telemetry from Bluetooth Low Energy (BLE) sensors and displays critical flight information including GPS position, altitude, vertical speed, and equipment status.

**Tech Stack:**
- **Framework:** Ionic Framework with Vue 3 Composition API
- **Platform:** Capacitor (iOS & Android)
- **Language:** TypeScript
- **Build Tool:** Vite
- **State Management:** Vue Composition API + Composables
- **BLE:** @capacitor-community/bluetooth-le

## Architecture

### High-Level Data Flow

```
BLE Sensors → Capacitor BLE Plugin → Decoders → Device Mapping → State Management → UI Components
```

1. **Hardware Layer**: BLE sensors broadcast advertisement packets (Ruuvi, Mopeka, TPMS, Otodata, BTHome)
2. **Bluetooth Layer**: Capacitor BLE Client scans and filters advertisements
3. **Decoding Layer**: Protocol-specific decoders parse raw data
4. **State Management**: Device mapping composable organizes data by units
5. **UI Layer**: Reactive components display real-time telemetry

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── units/          # Unit-specific display components (EnvelopeUnit, TankUnit, etc.)
│   └── ...
├── composables/        # Vue composables for shared logic
│   ├── useDeviceMapping.ts    # BLE device to balloon unit mapping
│   └── usePersistedRef.ts     # Persistent state management
├── decoders/           # BLE protocol decoders
│   ├── ruuvi.ts       # RuuviTag sensors (temp, humidity, pressure)
│   ├── mopeka.ts      # Tank level sensors
│   ├── bthome.ts      # BTHome v2 protocol
│   ├── tpms.ts        # Tire pressure sensors (repurposed)
│   └── otodata.ts     # Custom telemetry sensors
├── sensors/            # Sensor management modules
│   ├── blesensors.ts  # BLE scanning and device management
│   ├── barometer.ts   # Device barometer for altitude
│   └── location.ts    # GPS location services
├── process/            # Data processing and filtering
│   ├── pressure.ts    # Kalman filter for altitude/velocity
│   ├── qnh.ts         # QNH pressure corrections
│   └── sun.ts         # Sunrise/sunset calculations
├── views/              # Page components
│   ├── Tab1Page.vue   # Main flight status display
│   ├── Tab2Page.vue   # BLE scanner and device assignment
│   └── Tab3Page.vue   # Settings and configuration
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── state.ts       # Centralized state exports
│   ├── startup.ts     # App initialization
│   └── ble-utils.ts   # BLE helper functions
└── router/             # Vue Router configuration
```

## Key Components

### 1. BLE Sensor Management (`src/sensors/blesensors.ts`)

**Responsibilities:**
- Initialize BLE client
- Start/stop continuous scanning with `allowDuplicates: true`
- Filter advertisements by manufacturer ID and service UUID
- Maintain reactive Map of discovered devices
- Implement watchdog timer for scan health monitoring
- Auto-restart scanning if no data received for 10 seconds

**Key Exports:**
- `devices: Ref<Map<string, ExtendedScanResult>>` - Discovered BLE devices
- `isScanning: Ref<boolean>` - Scanning state
- `startBLEScan()` - Begin scanning
- `stopBLEScan()` - Stop scanning
- `restartBLEScan()` - Restart with cleanup

**Supported Sensors:**
- **Ruuvi** (0x0499): Temperature, humidity, pressure sensors
- **Mopeka** (0x0059): Propane tank level sensors
- **TPMS** (0x00AC, 0x0100): Tire pressure monitoring (repurposed)
- **Otodata** (0x03B1): Custom telemetry sensors
- **BTHome v2** (UUID 0000FCD2): Smart home protocol sensors
- **Rotarex** (0xFFFF): Custom sensors

### 2. Device Mapping Composable (`src/composables/useDeviceMapping.ts`)

**Responsibilities:**
- Map BLE device IDs to logical balloon units (Envelope, Tank1, Tank2, Tank3, OAT, Box, Vario)
- Persist device assignments across app restarts
- Aggregate sensor data by unit
- Calculate unit status (online/warning/offline) based on sensor age
- Filter metrics by priority (primary, secondary, hidden)
- Clean up stale sensors (>10 minutes old)

**Unit Types:**
- **Envelope**: Main balloon envelope temperature sensors
- **OAT**: Outside Air Temperature sensors
- **Tank1/2/3**: Propane tank level and temperature sensors
- **Box**: Battery/power monitoring
- **Vario**: Variometer/altimeter sensors

**Status Thresholds (per sensor type):**
```typescript
Ruuvi:   online: 5s,  warning: 10s,  offline: 15s   (broadcasts every 1-2s)
Mopeka:  online: 20s, warning: 30s,  offline: 60s   (broadcasts every 5-10s)
TPMS:    online: 400s, warning: 500s, offline: 800s (broadcasts every 360s)
```

**Key Functions:**
- `assignDeviceToUnit(deviceId, unitType)` - Assign device to unit
- `getDeviceUnit(deviceId)` - Get unit for device
- `getUnitStatus(unitType)` - Get unit status
- `getGroupedSensors(unitType)` - Get all sensors for unit
- `updateUnitData(deviceId, decodedValue, deviceType)` - Update unit with new data

### 3. Decoders (`src/decoders/`)

Each BLE protocol has a dedicated decoder that parses raw advertisement data into structured objects with standardized metric names:

**Common Metrics:**
- `temp` / `temperature` - Temperature in °C
- `hum` / `humidity` - Relative humidity %
- `batpct` - Battery percentage
- `percent` - Tank level percentage
- `level` - Tank level in mm
- `pressure` - Pressure readings
- `voltage` - Voltage measurements

**Example: Mopeka Decoder**
```typescript
export const parseMopeka = (data: DataView) => {
  return {
    percent: (reading / 255 * 100).toFixed(1),
    temp: data.getUint8(10) - 40,
    batpct: data.getUint8(11),
    qualityStars: calculateQuality(data)
  };
}
```

### 4. Main Flight Display (`src/views/Tab1Page.vue`)

**Components:**
- GPS altitude, speed, heading
- Kalman-filtered altitude (QNH corrected)
- Vertical speed with confidence interval
- Vertical acceleration
- Height above ground (AGL)
- Flight level (above transition altitude)
- Time to apex, apex level
- Units table showing all sensor data

**Key Features:**
- Real-time updates from BLE sensors
- Color-coded status indicators
- Confidence intervals for EKF estimates
- Visual scales for velocity and acceleration

### 5. Units Table (`src/components/units/UnitsTable.vue`)

Tabular display of all balloon units with their current metrics:

**Display Format:**
```
Unit     | Metrics
---------|----------------------------------
Envelope | Temp: 24.5° | Bat: 95%
OAT      | Temp: 18.2° | Hum: 65% | Bat: 87%
Tank1    | %: 78% | Level: 245mm | Bar: 12.5
```

**Features:**
- Row background colored by status (green/yellow/red)
- Metric values colored by age (fresh/recent/stale/old)
- Units without sensors automatically hidden
- Updates every 5 seconds

### 6. Kalman Filter (`src/process/pressure.ts`)

Extended Kalman Filter (EKF) for smooth altitude and velocity estimation:

**State Vector:**
- Altitude (ISA and QNH corrected)
- Vertical velocity
- Vertical acceleration

**Inputs:**
- Device barometer pressure
- Optional GPS altitude (for calibration)

**Outputs:**
- Filtered altitude with 95% confidence interval
- Filtered velocity with 95% confidence interval
- Filtered acceleration
- Time to zero velocity (apex prediction)
- Apex altitude prediction

## Development Guidelines

### State Management Pattern

**Persistent State:** Use `usePersistedRef` for data that should survive app restarts
```typescript
const deviceMappings = usePersistedRef<Record<string, UnitType>>('device-mappings', {});
```

**Volatile State:** Use regular `ref` for temporary runtime state
```typescript
const devices = ref<Map<string, ExtendedScanResult>>(new Map());
```

**Centralized Exports:** All major state is re-exported from `src/utils/state.ts` for easy imports

### BLE Development

**Adding New Sensor Types:**
1. Add manufacturer ID or service UUID to `allowedManufacturerIds` or `allowedServiceUUIDs` in `blesensors.ts`
2. Create decoder in `src/decoders/[sensor-type].ts`
3. Add case in `decodeSensor()` function
4. Update type definitions

**Decoder Best Practices:**
- Return plain objects with standardized metric names
- Handle missing/invalid data gracefully
- Use `DataView` for binary data parsing
- Document data format and byte offsets

### UI Component Patterns

**Unit Components:** Follow the pattern in `src/components/units/`
- Use `useDeviceMapping()` composable
- Implement reactive timestamp for age calculations
- Use computed properties for status and metrics
- Color-code by status (success/warning/danger)
- Display source device for each metric

**Metric Formatting:**
- Temperature: 1 decimal (`24.5°`)
- Humidity: no decimals (`65%`)
- Battery: no decimals (`87%`)
- Level: no decimals (`245mm`)
- Pressure: 1 decimal (`12.5 bar`)

### Testing

**BLE Testing:**
- Use Tab2 (BLE Scanner) to view raw sensor data
- Check decoded values match expected format
- Verify device appears with correct type and priority
- Test assignment to units

**Debug Info:**
- Enable via Settings (Tab3)
- Shows EKF state, confidence intervals, BLE statistics
- Watchdog timeout counter for scan health

## Important Patterns

### Reactive Timestamp Pattern

For age-based styling and status, use a reactive timestamp that updates periodically:

```typescript
const reactiveTime = ref(Date.now());
setInterval(() => {
  reactiveTime.value = Date.now();
}, 5000);

// Use in computed
const ageClass = computed(() => {
  const age = reactiveTime.value - lastUpdate;
  return age < 10000 ? 'fresh' : 'stale';
});
```

### Composable Pattern

Encapsulate reusable logic in composables:

```typescript
export const useDeviceMapping = () => {
  // State
  const deviceMappings = usePersistedRef(...);
  
  // Functions
  const assignDevice = (id, unit) => { ... };
  const getStatus = (unit) => { ... };
  
  // Return API
  return {
    assignDevice,
    getStatus,
    ...
  };
};
```

### Watchdog Pattern

Monitor critical background processes and auto-recover:

```typescript
let watchdogTimer: NodeJS.Timeout | null = null;

const resetWatchdog = () => {
  if (watchdogTimer) clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(async () => {
    console.warn("Timeout - restarting...");
    await restart();
  }, TIMEOUT);
};
```

## App Lifecycle

**Foreground:**
- Start BLE scanning
- Start location tracking
- Start barometer
- Start timer for state updates
- Acquire wake lock (keep screen on)

**Background:**
- Stop BLE scanning (battery optimization)
- Stop location tracking
- Stop barometer
- Release wake lock

**Handled by:** `src/utils/startup.ts`

## Build & Deployment

**Development:**
```bash
bun run dev              # Web development server
bun run debug-ios-i16    # iOS simulator
bun run debug-android-a15 # Android emulator
```

**Production Builds:**
```bash
bun run ios-beta         # iOS beta build
bun run android-beta     # Android beta build
bun run build-dev        # Web build
```

**Capacitor Sync:**
```bash
npx cap sync             # Sync web assets to native platforms
```

## Common Issues & Solutions

**BLE Scanning Stops:**
- Check watchdog counter in Debug Info
- Manually restart scan from Tab2
- Verify device Bluetooth is enabled
- Check for Capacitor plugin issues

**Sensor Not Appearing:**
- Verify manufacturer ID is in allowed list
- Check sensor is broadcasting (use generic BLE scanner app)
- Verify decoder handles data format correctly
- Check console for decoding errors

**Stale Data:**
- Check sensor battery level
- Verify sensor is within range (<10m)
- Check sensor broadcast interval
- Verify threshold matches sensor type

**Unit Status Wrong:**
- Check sensor age vs. threshold
- Verify device assignment is correct
- Check reactive timestamp is updating
- Review status aggregation logic

## Performance Considerations

- **BLE Scanning:** Low latency mode provides fastest updates but uses more battery
- **Watchdog:** 10-second timeout prevents hung scans
- **Cleanup:** Sensors older than 10 minutes are automatically removed
- **Reactive Updates:** UI updates are throttled to every 5 seconds via reactive timestamp
- **Filtering:** Only process advertisements from known sensor types

## Future Enhancements

- [ ] Cloud sync for flight logs
- [ ] Offline maps for terrain elevation
- [ ] Predictive landing zone calculation
- [ ] Wind speed/direction integration
- [ ] Burner usage tracking
- [ ] Multi-balloon fleet monitoring
- [ ] Export flight data (GPX, KML)

## Resources

- [Ionic Framework Documentation](https://ionicframework.com/docs)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor BLE Plugin](https://github.com/capacitor-community/bluetooth-le)
- [RuuviTag Protocol](https://github.com/ruuvi/ruuvi-sensor-protocols)
- [BTHome Protocol](https://bthome.io/)
- [Mopeka Protocol](https://github.com/Bluetooth-Devices/mopeka-iot-ble)

## Contact & Support

For questions or issues, refer to the project repository documentation or contact the development team.

---

**Last Updated:** February 1, 2026
**Version:** 1.0.0

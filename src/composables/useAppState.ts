// src/composables/useAppState.ts
import { watch } from "vue";
import { usePersistedRef } from "./usePersistedRef";
import { usePersistedRefWithTimestamp } from "./usePersistedRefWithTimestamp";
import { Capacitor } from "@capacitor/core";
import type { UnitType } from "@/types/units";

/** How the broker was added to the list */
export type BrokerSource = "preconfigured" | "discovered" | "manual";

/**
 * Service entry representing an MQTT broker.
 *
 * Matching Strategy:
 * Preferred broker is matched against discovered services by comparing
 * instance name and port number.
 */
export type ServiceEntry = {
  name: string;
  type: string;
  host: string;
  port: number;
  domain?: string; // e.g., 'local' - added for robust broker matching
  discovered?: boolean; // kept for backward compat; prefer `source`
  resolved?: boolean;
  txtRecord?: Record<string, any>;
  ipv4Addresses?: string[];
  ipv6Addresses?: string[];
  autoConnect?: boolean; // Auto-connect to this broker when preferred and status is found/manual
  source?: BrokerSource;
  username?: string;
  password?: string;
  rejectUnauthorized?: boolean; // TLS certificate verification (default true)
  tested?: boolean; // true after a successful inline test-connect
};

/**
 * App-level persisted state using Capacitor Preferences.
 * These refs are shared across all components that import this composable.
 * Values are automatically saved when mutated and loaded on app startup.
 *
 * Consolidated from:
 * - mqtt.ts (mqttBrokerUrl, mqttUser, mqttPassword)
 * - useDeviceMapping.ts (deviceMappings)
 * - useDemUrl.ts (selectedDemUrl)
 * - qnh.ts (manualQNHvalue, autoQNHflag)
 * - pressure.ts (transitionAltitude, historySamples, decimateEKFSamples)
 * - Tab1Page.vue (elevationAtTakeoff, altitudeAtTakeoff with timestamps)
 * - blesensors.ts (bleScanTimeouts, bleInitErrors)
 * - startup.ts (showDebugInfo)
 * - ScannerView.vue (manualHost, manualPort, selectedType)
 */

// ============================================================================
// MQTT Configuration
// ============================================================================
export const mqttBrokerUrl = usePersistedRef<string>(
  "mqtt_broker_url",
  import.meta.env.VITE_MQTT_BROKER_URL || "",
);

export const mqttUser = usePersistedRef<string>(
  "mqtt_user",
  import.meta.env.VITE_MQTT_BROKER_USER || "",
);

export const mqttPassword = usePersistedRef<string>(
  "mqtt_password",
  import.meta.env.VITE_MQTT_BROKER_PASSWORD || "",
);

// ============================================================================
// MQTT Broker Selection
// ============================================================================
export const preferredBroker = usePersistedRef<ServiceEntry | null>(
  "preferredBroker",
  null,
);

// ============================================================================
// BLE Scanner UI State
// ============================================================================
export const manualHost = usePersistedRef<string>("manualHost", "");
export const manualPort = usePersistedRef<number>(
  "manualPort",
  import.meta.env.VITE_MQTT_BROKER_PORT || 8883,
);
export const selectedType = usePersistedRef<string>(
  "selectedType",
  "_mqtt-ws._tcp",
);

// ============================================================================
// Device Mapping
// ============================================================================
export const deviceMappings = usePersistedRef<Record<string, UnitType | null>>(
  "device-unit-mappings",
  {},
);

// ============================================================================
// Sensor Configuration
// ============================================================================
export const selectedDemUrl = usePersistedRef<string>(
  "selectedDemUrl",
  "https://download.mapterhorn.com/planet.pmtiles",
);
// One-time migration: old default pointed at eudem; move existing installs to mapterhorn.
const OLD_DEFAULT_DEM_URL =
  "https://static.mah.priv.at/cors/dem/eudem_dem_4258_europe.pmtiles";
watch(
  selectedDemUrl,
  (url) => {
    if (url === OLD_DEFAULT_DEM_URL) {
      selectedDemUrl.value = "https://download.mapterhorn.com/planet.pmtiles";
    }
  },
  { once: true },
);

// ============================================================================
// QNH / Altimeter Settings
// ============================================================================
export const manualQNHvalue = usePersistedRef<number>(
  "manualQNHvalue",
  1013.25,
);

export const autoQNHflag = usePersistedRef<boolean>("autoQNHflag", true);

// ============================================================================
// Airspace Map Settings
// ============================================================================
/**
 * Zoom below which the airspace overlay is not drawn.
 *
 * Zoomed far enough out, individual airspace is unreadable and the polygon
 * count grows without giving the pilot anything — France holds 1768 airspaces.
 * The altitude stack is unaffected; only the map overlay is suppressed.
 */
export const airspaceMinZoom = usePersistedRef<number>("airspaceMinZoom", 8);

/**
 * Zoom below which airport markers are not drawn.
 *
 * Marker radius is in screen pixels, so zooming out packs airports together
 * under fixed-size dots — measured 2253 overlapping pairs five steps out from
 * Paris. Radius scaling (airportMarkerRadius) handles the mid-range; below
 * this zoom even scaled dots are an unreadable blob.
 */
export const airportMinZoom = usePersistedRef<number>("airportMinZoom", 8);

// ============================================================================
// EKF / Barometer Settings
// ============================================================================
export const transitionAltitude = usePersistedRef<number>(
  "transitionAltitude",
  7000,
);

// Helper function to get platform-specific default for history samples
const getDefaultHistorySamples = (): number => {
  const platformEnv = import.meta.env.VITE_CAPACITOR_PLATFORM;
  return platformEnv === "ios" || platformEnv === "web" ? 5 : 50;
};

export const historySamples = usePersistedRef<number>(
  "historySamples",
  getDefaultHistorySamples(),
);

// Helper function to get platform-specific default for EKF decimation
const getDefaultDecimation = (): number => {
  return Capacitor.getPlatform() === "android" ? 5 : 1;
};

export const decimateEKFSamples = usePersistedRef<number>(
  "decimateEKFSamples",
  getDefaultDecimation(),
);

// ============================================================================
// Flight Telemetry (with timestamps)
// ============================================================================
export const elevationAtTakeoff = usePersistedRefWithTimestamp<number | null>(
  "elevationAtTakeoff",
  null,
);

export const altitudeAtTakeoff = usePersistedRefWithTimestamp<number | null>(
  "altitudeAtTakeoff",
  null,
);

// ============================================================================
// BLE Debugging Statistics
// ============================================================================
export const bleScanTimeouts = usePersistedRef<number>("bleScanTimeouts", 0);
export const bleInitErrors = usePersistedRef<number>("bleInitErrors", 0);

// ============================================================================
// Debug Settings
// ============================================================================
export const showDebugInfo = usePersistedRef<boolean>(
  "showDebugInfo",
  import.meta.env.MODE === "development",
);

/**
 * Returns shared app-level state refs.
 * All components calling this get the same ref instances.
 */
export function useAppState() {
  return {
    // MQTT Configuration
    mqttBrokerUrl,
    mqttUser,
    mqttPassword,
    // MQTT Broker Selection
    preferredBroker,
    // BLE Scanner UI State
    manualHost,
    manualPort,
    selectedType,
    // Device Mapping
    deviceMappings,
    // Sensor Configuration
    selectedDemUrl,
    // QNH / Altimeter Settings
    manualQNHvalue,
    autoQNHflag,
    // EKF / Barometer Settings
    transitionAltitude,
    historySamples,
    decimateEKFSamples,
    // Flight Telemetry
    elevationAtTakeoff,
    altitudeAtTakeoff,
    // BLE Debugging Statistics
    bleScanTimeouts,
    bleInitErrors,
    // Airspace Map Settings
    airspaceMinZoom,
    airportMinZoom,
    // Debug Settings
    showDebugInfo,
  };
}

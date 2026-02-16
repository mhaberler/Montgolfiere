import { ref, computed, readonly } from "vue";
import { usePersistedRef } from "@/composables/usePersistedRef";
import type { UnitType } from "@/types/units";

export interface UnitSensorData {
  deviceId: string;
  deviceType: string; // "Ruuvi", "Mopeka", "TPMS", etc.
  decodedValue: any;
  lastUpdate: number;
  sensorMetrics: string[]; // ["temperature", "pressure"] or ["level", "temperature"]
}

export interface GroupedSensorData {
  [sensorType: string]: UnitSensorData[];
}

export interface UnitStatus {
  status: "online" | "warning" | "offline";
  color: "success" | "warning" | "danger";
  lastUpdate: number;
  sensorCount: number; // Active sensors
  totalSensors?: number; // Total sensors (including stale ones)
}

export interface MetricConfig {
  primary: string[]; // Always visible, large display
  secondary: string[]; // Visible by default, medium display
  hidden: string[]; // Available but not shown by default
}

export interface FilteredMetrics {
  primary: string[];
  secondary: string[];
  utility: string[]; // Available metrics not in primary/secondary
}

export const unitTypes: UnitType[] = [
  "Envelope",
  "OAT",
  "Tank1",
  "Tank2",
  "Tank3",
  "Box",
  "Vario",
  "Switch",
];

const SENSOR_CLEANUP_TIMER = 2000;
// Global sensor cleanup threshold (10 minutes)
const SENSOR_CLEANUP_THRESHOLD = 10 * 60 * 1000;

// Per-sensor-type status thresholds (in milliseconds)
const SENSOR_STATUS_THRESHOLDS = {
  Ruuvi: {
    online: 10 * 1000, // broadcasts every 1-2s
    warning: 20 * 1000,
    offline: 60 * 1000,
  },
  Mopeka: {
    online: 20 * 1000, // 15 seconds (broadcasts every 5-10s)
    warning: 30 * 1000, // 30 seconds
    offline: 60 * 1000,
  },
  TPMS: {
    online: 400 * 1000, // 1 minute (broadcasts every 360s)
    warning: 500 * 1000, // 2 minutes
    offline: 800 * 1000,
  },
  Otodata: {
    online: 15 * 1000, // 5 seconds
    warning: 20 * 1000, // 10 seconds
    offline: 30 * 1000,
  },
  "BTHome-v2": {
    online: 4 * 1000, // 3 seconds (very frequent)
    warning: 10 * 1000, // 5 seconds
    offline: 30 * 1000,
  },
  MikroTik: {
    online: 10 * 1000, // Same as Ruuvi (broadcasts every 1-2s)
    warning: 20 * 1000,
    offline: 60 * 1000,
  },
  default: {
    online: 30 * 1000, // Default 30 seconds
    warning: 60 * 1000, // Default 60 seconds
    offline: 120 * 1000,
  },
};

// Unit-specific metric configuration
const UNIT_METRIC_CONFIGS: Record<UnitType, MetricConfig> = {
  Tank1: {
    primary: ["percent", "level", "bar"],
    secondary: ["pressure", "voltage"],
    hidden: [
      "rssi",
      "accelerationX",
      "accelerationY",
      "accelerationZ",
      "humidity",
    ],
  },
  Tank2: {
    primary: ["percent", "level", "bar"],
    secondary: ["pressure", "voltage"],
    hidden: [
      "rssi",
      "accelerationX",
      "accelerationY",
      "accelerationZ",
      "humidity",
    ],
  },
  Tank3: {
    primary: ["percent", "level", "bar"],
    secondary: ["batpct", "qualityStars"],
    hidden: [
      "rssi",
      "accelerationX",
      "accelerationY",
      "accelerationZ",
      "humidity",
    ],
  },
  Envelope: {
    primary: ["temp", "hum", "batpct"],
    secondary: [],
    hidden: [
      "level",
      "rssi",
      "accelerationX",
      "accelerationY",
      "accelerationZ",
    ],
  },
  OAT: {
    primary: ["temp", "hum", "batpct"],
    secondary: ["batpct"],
    hidden: [
      "level",
      "voltage",
      "rssi",
      "accelerationX",
      "accelerationY",
      "accelerationZ",
    ],
  },
  Box: {
    primary: ["voltage_V", "current_A"],
    secondary: ["batpct"],
    hidden: [
      "level",
      "voltage",
      "rssi",
      "accelerationX",
      "accelerationY",
      "accelerationZ",
    ],
  },
  Vario: {

  primary: ["distance (m)_m", "speed_m/s", "acceleration_m/s²"],
    secondary: [],
    hidden: [
    ],
  },
  Switch: {
    primary: ["reed_switch", "window"],
    secondary: ["battery_%"],
    hidden: [
      "accx",
      "accy",
      "accz",
      "version",
      "salt",
      "uptime",
      "accel_tilt",
      "accel_drop",
      "impact_x",
      "impact_y",
      "impact_z",
      "dev",
      "encrypted",
    ],
  },
};

// Persisted mapping: deviceId -> unitType (allows conflicts/multiple assignments)
const deviceMappings = usePersistedRef<Record<string, UnitType | null>>(
  "device-unit-mappings",
  {}
);

// Real-time unit data: unitType -> array of sensor data
const unitSensors = ref<Record<UnitType, UnitSensorData[]>>({
  Envelope: [],
  OAT: [],
  Tank1: [],
  Tank2: [],
  Tank3: [],
  Box: [],
  Vario: [],
  Switch: [],
});

// Reactive timestamp for time-based calculations
const reactiveTimestamp = ref(Date.now());

// Update reactive timestamp every 10 seconds to trigger status updates
const updateInterval = setInterval(() => {
  reactiveTimestamp.value = Date.now();
}, SENSOR_CLEANUP_TIMER);

// Cleanup function for the interval (should be called when app unmounts)
const cleanupReactiveTimer = () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
};

export const useDeviceMapping = () => {
  // Helper function to get sensor timeout based on device type
  const getSensorTimeout = (deviceType: string): number => {
    const thresholds = (SENSOR_STATUS_THRESHOLDS as Record<string, any>)[
      deviceType
    ];
    return thresholds?.offline || SENSOR_STATUS_THRESHOLDS.default.offline;
  };

  // Helper function to get status thresholds for a sensor type
  const getSensorStatusThresholds = (deviceType: string) => {
    return (
      (SENSOR_STATUS_THRESHOLDS as Record<string, any>)[deviceType] ||
      SENSOR_STATUS_THRESHOLDS.default
    );
  };

  // Helper function to filter active sensors based on their type-specific timeouts
  const getActiveSensors = (
    sensors: UnitSensorData[],
    now: number = Date.now()
  ): UnitSensorData[] => {
    return sensors.filter((sensor) => {
      const timeout = getSensorTimeout(sensor.deviceType);
      const ageMs = now - sensor.lastUpdate;
      return ageMs <= timeout;
    });
  };

  // Helper function to clean up very old sensors (background cleanup)
  const cleanupStaleSensors = (
    sensors: UnitSensorData[],
    now: number = Date.now()
  ): UnitSensorData[] => {
    return sensors.filter((sensor) => {
      const ageMs = now - sensor.lastUpdate;
      return ageMs <= SENSOR_CLEANUP_THRESHOLD;
    });
  };

  const assignDeviceToUnit = (deviceId: string, unitType: UnitType | null) => {
    if (unitType === null) {
      delete deviceMappings.value[deviceId];
      // Remove from all units
      Object.keys(unitSensors.value).forEach((unit) => {
        unitSensors.value[unit as UnitType] = unitSensors.value[
          unit as UnitType
        ].filter((sensor) => sensor.deviceId !== deviceId);
      });
    } else {
      deviceMappings.value[deviceId] = unitType;
    }

    // Console log for export/debugging
    console.log("Device Mappings Updated:", {
      mappings: deviceMappings.value,
      timestamp: new Date().toISOString(),
      action: unitType
        ? `Assigned ${deviceId} to ${unitType}`
        : `Unassigned ${deviceId}`,
    });
  };

  const getDeviceUnit = (deviceId: string): UnitType | null => {
    return deviceMappings.value[deviceId] || null;
  };

  const updateUnitData = (
    deviceId: string,
    decodedValue: any,
    deviceType: string
  ) => {
    const unitType = deviceMappings.value[deviceId];
    if (unitType && decodedValue) {
      const now = Date.now();

      // Background cleanup: remove very old sensors before updating
      unitSensors.value[unitType] = cleanupStaleSensors(
        unitSensors.value[unitType],
        now
      );

      // Extract metrics from decoded value
      const sensorMetrics =
        typeof decodedValue === "object" ? Object.keys(decodedValue) : [];

      const existingIndex = unitSensors.value[unitType].findIndex(
        (sensor) => sensor.deviceId === deviceId
      );

      const sensorData: UnitSensorData = {
        deviceId,
        decodedValue,
        lastUpdate: now,
        deviceType,
        sensorMetrics,
      };

      if (existingIndex >= 0) {
        // Update existing sensor
        unitSensors.value[unitType][existingIndex] = sensorData;
      } else {
        // Add new sensor to unit
        unitSensors.value[unitType].push(sensorData);
      }

      // console.debug(`Unit ${unitType} updated:`, {
      //   deviceId,
      //   deviceType,
      //   value: decodedValue,
      //   sensorCount: unitSensors.value[unitType].length,
      // });
    }
  };

  // Compute unit status based on sensor ages with timeout filtering
  const getUnitStatus = (unitType: UnitType): UnitStatus => {
    const allSensors = unitSensors.value[unitType];
    const now = reactiveTimestamp.value; // Use reactive timestamp instead of Date.now()

    // Filter to get only active sensors based on their type-specific timeouts
    const activeSensors = getActiveSensors(allSensors, now);

    if (activeSensors.length === 0) {
      return {
        status: "offline",
        color: "danger",
        lastUpdate:
          allSensors.length > 0
            ? Math.max(...allSensors.map((s) => s.lastUpdate))
            : 0,
        sensorCount: activeSensors.length,
        totalSensors: allSensors.length,
      };
    }

    // Evaluate status for each sensor individually based on type-specific thresholds
    const sensorStatuses = activeSensors.map((sensor) => {
      const thresholds = getSensorStatusThresholds(sensor.deviceType);
      const ageMs = now - sensor.lastUpdate;

      if (ageMs <= thresholds.online) return "online";
      if (ageMs <= thresholds.warning) return "warning";
      return "offline";
    });

    // Count statuses for debugging/logging
    const onlineCount = sensorStatuses.filter((s) => s === "online").length;
    const warningCount = sensorStatuses.filter((s) => s === "warning").length;
    const offlineCount = sensorStatuses.filter((s) => s === "offline").length;
    const totalActive = sensorStatuses.length;

    // Log sensor status distribution for debugging
    if (totalActive > 1) {
      console.log(`Unit ${unitType} sensor status:`, {
        online: onlineCount,
        warning: warningCount,
        offline: offlineCount,
        total: totalActive,
      });
    }

    // Determine overall unit status based on sensor status distribution
    let status: "online" | "warning" | "offline";
    let color: "success" | "warning" | "danger";

    if (offlineCount > 0) {
      // Any offline sensors cause warning or danger
      if (offlineCount >= totalActive * 0.5) {
        status = "offline";
        color = "danger";
      } else {
        status = "warning";
        color = "warning";
      }
    } else if (warningCount > 0) {
      // Some warning sensors but none offline
      status = "warning";
      color = "warning";
    } else {
      // All sensors online
      status = "online";
      color = "success";
    }

    // If we have mixed sensor states between active and total, adjust status
    const totalSensors = allSensors.length;
    const activeRatio = activeSensors.length / totalSensors;

    if (totalSensors > 1 && activeRatio < 1.0) {
      // Some sensors are completely stale (beyond timeout) - adjust status if needed
      if (status === "online" && activeRatio < 0.7) {
        status = "warning";
        color = "warning";
      }
    }

    const latestUpdate = Math.max(...activeSensors.map((s) => s.lastUpdate));

    return {
      status,
      color,
      lastUpdate: latestUpdate,
      sensorCount: activeSensors.length,
      totalSensors,
    };
  };

  // Group sensors by type for heterogeneous display (filtered for active sensors)
  const getGroupedSensors = (unitType: UnitType): GroupedSensorData => {
    const allSensors = unitSensors.value[unitType];
    const activeSensors = getActiveSensors(allSensors, reactiveTimestamp.value);

    return activeSensors.reduce((groups, sensor) => {
      const type = sensor.deviceType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(sensor);
      return groups;
    }, {} as GroupedSensorData);
  };

  // Get available metrics across all active sensor types in a unit
  const getUnitMetrics = (unitType: UnitType): string[] => {
    const allSensors = unitSensors.value[unitType];
    const activeSensors = getActiveSensors(allSensors, reactiveTimestamp.value);
    const allMetrics = new Set<string>();

    activeSensors.forEach((sensor) => {
      if (sensor.decodedValue && typeof sensor.decodedValue === "object") {
        Object.keys(sensor.decodedValue).forEach((key) => allMetrics.add(key));
      }
    });

    return Array.from(allMetrics);
  };

  // Get filtered metrics based on unit configuration
  const getFilteredMetrics = (unitType: UnitType): FilteredMetrics => {
    const availableMetrics = getUnitMetrics(unitType);
    const config = UNIT_METRIC_CONFIGS[unitType];

    // Filter available metrics based on configuration
    const primary = availableMetrics.filter((metric) =>
      config.primary.includes(metric)
    );
    const secondary = availableMetrics.filter((metric) =>
      config.secondary.includes(metric)
    );

    // Utility metrics are available but not in primary/secondary and not hidden
    const utility = availableMetrics.filter(
      (metric) =>
        !config.primary.includes(metric) &&
        !config.secondary.includes(metric) &&
        !config.hidden.includes(metric)
    );

    return { primary, secondary, utility };
  };

  // Get primary metrics only (for compact displays)
  const getPrimaryMetrics = (unitType: UnitType): string[] => {
    return getFilteredMetrics(unitType).primary;
  };

  // Get all visible metrics (primary + secondary)
  const getVisibleMetrics = (unitType: UnitType): string[] => {
    const filtered = getFilteredMetrics(unitType);
    return [...filtered.primary, ...filtered.secondary];
  };

  // Check if a metric should be displayed prominently
  const isMetricPrimary = (unitType: UnitType, metric: string): boolean => {
    return UNIT_METRIC_CONFIGS[unitType].primary.includes(metric);
  };

  // Check if a metric should be displayed normally
  const isMetricSecondary = (unitType: UnitType, metric: string): boolean => {
    return UNIT_METRIC_CONFIGS[unitType].secondary.includes(metric);
  };

  // Check if a metric should be hidden by default
  const isMetricHidden = (unitType: UnitType, metric: string): boolean => {
    return UNIT_METRIC_CONFIGS[unitType].hidden.includes(metric);
  };

  const getUnitSensors = (
    unitType: UnitType,
    includeStale: boolean = false
  ): UnitSensorData[] => {
    const allSensors = unitSensors.value[unitType];
    return includeStale
      ? allSensors
      : getActiveSensors(allSensors, reactiveTimestamp.value);
  };

  // Get all sensors including stale ones
  const getAllUnitSensors = (unitType: UnitType): UnitSensorData[] => {
    return unitSensors.value[unitType];
  };

  // Get the most recent/primary sensor data for a unit (from active sensors)
  const getPrimarySensorData = (unitType: UnitType): UnitSensorData | null => {
    const allSensors = unitSensors.value[unitType];
    const activeSensors = getActiveSensors(allSensors, reactiveTimestamp.value);
    if (activeSensors.length === 0) return null;

    // Return the most recently updated active sensor
    return activeSensors.reduce((latest, current) =>
      current.lastUpdate > latest.lastUpdate ? current : latest
    );
  };

  const getMappedDevices = computed(() => {
    return Object.entries(deviceMappings.value)
      .filter(([, unitType]) => unitType !== null)
      .map(([deviceId, unitType]) => ({ deviceId, unitType }));
  });

  // Debug export function
  const exportMappings = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      deviceMappings: deviceMappings.value,
      unitSensors: Object.fromEntries(
        Object.entries(unitSensors.value).map(([unit, sensors]) => [
          unit,
          sensors.map((s) => ({
            deviceId: s.deviceId,
            deviceType: s.deviceType,
            lastUpdate: s.lastUpdate,
            ageSeconds: Math.floor((Date.now() - s.lastUpdate) / 1000),
            metrics: s.sensorMetrics,
          })),
        ])
      ),
      unitStatuses: Object.fromEntries(
        unitTypes.map((unit) => [unit, getUnitStatus(unit)])
      ),
    };

    console.log("=== DEVICE MAPPING EXPORT ===");
    console.log(JSON.stringify(exportData, null, 2));
    return exportData;
  };

  return {
    deviceMappings: readonly(deviceMappings),
    unitSensors: readonly(unitSensors),
    assignDeviceToUnit,
    getDeviceUnit,
    updateUnitData,
    getUnitStatus,
    getGroupedSensors,
    getUnitMetrics,
    getFilteredMetrics,
    getPrimaryMetrics,
    getVisibleMetrics,
    isMetricPrimary,
    isMetricSecondary,
    isMetricHidden,
    getUnitSensors,
    getAllUnitSensors,
    getPrimarySensorData,
    getMappedDevices,
    getActiveSensors,
    getSensorTimeout,
    getSensorStatusThresholds,
    cleanupReactiveTimer,
    exportMappings,
  };
};

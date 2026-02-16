import { ref } from "vue";
import {
  BleClient,
  ScanResult,
  ScanMode,
} from "@capacitor-community/bluetooth-le";
// import { toastController } from "@ionic/vue";
import { parseRuuvi } from "@/decoders/ruuvi";
import { parseOtodata } from "@/decoders/otodata";
import { parseMystery } from "@/decoders/mystery";
import { parseMopeka } from "@/decoders/mopeka";
import { parseTPMS0100, parseTPMS00AC } from "@/decoders/tpms";
import { decodeBTHome } from "@/decoders/bthome";
import { parseMikrotik } from "@/decoders/mikrotik";
import { useDeviceMapping } from "@/composables/useDeviceMapping";
import { usePersistedRef } from "../composables/usePersistedRef";

// Extended device interface with decoded data and timestamp
export interface ExtendedScanResult {
  scanResult: ScanResult;
  decoded: Record<string, any>;
  lastSeen: number; // Unix timestamp
}

// Reactive state for BLE scanning
export const isScanning = ref(false);
export const devices = ref<Map<string, ExtendedScanResult>>(new Map());
export const bleErrorMsg = ref<string | null>(null);

export const bleScanTimeouts = usePersistedRef<number>("bleScanTimeouts", 0);
export const bleInitErrors = usePersistedRef<number>("bleInitErrors", 0);
export const bleAdvertisements = ref(0);
export const bleDeviceUpdates = ref(0);
export const bleScanStarts = ref(0);
export const bleScanErrors = ref(0);

// Reset the BLE scan restart counter
export const resetbleScanTimeouts = () => {
  bleScanTimeouts.value = 0;
};

// Watchdog timer for BLE scan health monitoring
let scanWatchdogTimer: NodeJS.Timeout | null = null;
const WATCHDOG_TIMEOUT = 10000; // 10 seconds

// Reset watchdog timer (called on each scan result)
const resetWatchdog = () => {
  if (scanWatchdogTimer) {
    clearTimeout(scanWatchdogTimer);
  }

  scanWatchdogTimer = setTimeout(async () => {
    console.warn("BLE scan watchdog timeout - restarting scan");

    // Increment restart counter
    bleScanTimeouts.value++;

    // // Show toast notification
    // const toast = await toastController.create({
    //   message: "BLE scan restarted - no devices detected for 15 seconds",
    //   duration: 3000,
    //   color: "warning",
    //   position: "top",
    //   icon: "refresh-outline",
    // });
    // await toast.present();

    await restartBLEScan();
  }, WATCHDOG_TIMEOUT);
};

// Stop watchdog timer
const stopWatchdog = () => {
  if (scanWatchdogTimer) {
    clearTimeout(scanWatchdogTimer);
    scanWatchdogTimer = null;
  }
};

// Manufacturer IDs to filter for (common beacon manufacturers)
const allowedManufacturerIds = {
  0x0499: { type: "Ruuvi", sortingPriority: 1 },
  0xffff: { type: "Rotarex", sortingPriority: 2 },
  0x03b1: { type: "Otodata", sortingPriority: 3 },
  0x00ac: { type: "TPMS1", sortingPriority: 4 },
  0x0100: { type: "TPMS4", sortingPriority: 5 },
  0x0059: { type: "Mopeka", sortingPriority: 6 },
  0x094f: { type: "MikroTik", sortingPriority: 8 },

  //   0x0ba9: { type: "BTHome-v2", sortingPriority: 7 },
  // Add more manufacturer IDs as needed
} as const;

const allowedServiceUUIDs = {
  "0000fcd2-0000-1000-8000-00805f9b34fb": {
    type: "BTHome-v2",
    sortingPriority: 7,
  },
  // Add more service UUIDs as needed
} as const;

// Helper function to check if device has allowed manufacturer data or service data
const isAllowedBeacon = (result: ScanResult): boolean => {
  // Check for allowed manufacturer data
  if (result.manufacturerData) {
    for (const [manufacturerId] of Object.entries(result.manufacturerData)) {
      const id = parseInt(manufacturerId, 10);
      if (id in allowedManufacturerIds) {
        return true;
      }
    }
  }

  // Check for allowed service data UUIDs
  if (result.serviceData) {
    for (const [serviceUUID] of Object.entries(result.serviceData)) {
      if (serviceUUID in allowedServiceUUIDs) {
        return true;
      }
    }
  }

  return false;
};

// Initialize BLE client
export const initializeBLE = async (): Promise<void> => {
  try {
    await BleClient.initialize({ androidNeverForLocation : true});
    console.log("BLE initialized successfully");
  } catch (e) {
    bleInitErrors.value++;
    bleErrorMsg.value = "Failed to initialize Bluetooth: " + (e as Error).message;
    console.error("BLE initialization error:", e);
    throw e;
  }
};

// Store current scan mode
let currentScanMode: ScanMode = ScanMode.SCAN_MODE_LOW_LATENCY;

// Add a function to change scan mode dynamically based on app state
export const setScanMode = (mode: ScanMode): void => {
  currentScanMode = mode;
  console.log(`BLE scan mode changed to: ${mode}`);
};

// Start BLE scanning
export const startBLEScan = async (): Promise<void> => {
    bleScanStarts.value++;
  try {
    // devices.value = [];
    bleErrorMsg.value = null;
    isScanning.value = true;

    // Get device mapping functions
    const { updateUnitData } = useDeviceMapping();

    await BleClient.requestLEScan(
      {
        allowDuplicates: true,
        scanMode: currentScanMode, // Use dynamic scan mode
      },
      (result) => {
        bleAdvertisements.value++;

        // Filter: only show beacons with allowed manufacturer IDs
        if (!isAllowedBeacon(result)) {
          return;
        }

        // Check if device already exists in the map
        const deviceId = result.device.deviceId;
        const exists = devices.value.get(deviceId);

        if (!exists) {
          // Create extended device data with decoded property and timestamp
          const extendedDevice: ExtendedScanResult = {
            scanResult: result,
            decoded: decodeSensor(result),
            lastSeen: Date.now(),
          };
          devices.value.set(deviceId, extendedDevice);

          // Update mapped units with new data
          updateUnitData(
            deviceId,
            extendedDevice.decoded.value,
            extendedDevice.decoded.type || "Unknown"
          );
        } else {
          // Update existing device's last seen timestamp, scan result, and decoded data
          exists.lastSeen = Date.now();
          exists.scanResult = result;
          exists.decoded = decodeSensor(result);

          // Update mapped units with new data
          updateUnitData(
            deviceId,
            exists.decoded.value,
            exists.decoded.type || "Unknown"
          );
        }
        bleDeviceUpdates.value++;

        // Reset the watchdog timer on each valid scan result
        resetWatchdog();
      }
    );

    // Start watchdog timer
    resetWatchdog();

    // Start periodic cleanup when scanning starts
    // startPeriodicCleanup();

    console.log(`BLE scan started successfully with mode: ${currentScanMode}`);
  } catch (e) {
    bleScanErrors.value++;
    bleErrorMsg.value = "Scan error: " + (e as Error).message;
    isScanning.value = false;
    stopWatchdog(); // Stop watchdog on error
    console.error("BLE scan error:", e);
    throw e;
  }
};

// Stop BLE scanning
export const stopBLEScan = async (): Promise<void> => {
  try {
    if (isScanning.value) {
      // Stop watchdog timer
      stopWatchdog();

      await BleClient.stopLEScan();
      isScanning.value = false;

      // Stop cleanup when scanning stops
      //   stopPeriodicCleanup();

      console.log("BLE scan stopped");
    }
  } catch (e) {
    console.error("Error stopping BLE scan:", e);
    // Don't throw here as we want to ensure the state is updated
    isScanning.value = false;
    stopWatchdog(); // Ensure watchdog is stopped even on error
  }
};

// Restart BLE scanning
export const restartBLEScan = async (): Promise<void> => {
  await stopBLEScan();
  // Small delay to ensure previous scan is fully stopped
  await new Promise((resolve) => setTimeout(resolve, 100));
  // devices.value.clear();
  await startBLEScan();
};

export const clearBLEDevices = () => {
  devices.value.clear();
};

// Initialize BLE and start scanning
export const initializeAndStartBLEScan = async (): Promise<void> => {
  try {
    await initializeBLE();
    await startBLEScan();
  } catch (e) {
    console.error("Failed to initialize and start BLE scan:", e);
    // Don't re-throw to prevent app initialization from failing
  }
};

// Cleanup function to stop scanning
export const cleanupBLE = async (): Promise<void> => {
  await stopBLEScan();
  //   stopPeriodicCleanup(); // Ensure cleanup is stopped
};

export const getScanningStatus = () => {
  return {
    isScanning: isScanning.value,
    deviceCount: devices.value.size,
    hasError: !!bleErrorMsg.value,
    errorMessage: bleErrorMsg.value,
  };
};

// // Utility function to get devices with age information
// export const getDevicesWithAge = () => {
//   const now = Date.now();
//   return devices.value.map((device) => ({
//     ...device,
//     ageSeconds: Math.floor((now - device.lastSeen) / 1000),
//     ageMinutes: Math.floor((now - device.lastSeen) / 60000),
//   }));
// };

// // Utility function to clean up old devices (older than specified minutes)
// export const cleanupOldDevices = (maxAgeMinutes: number = 5): void => {
//   const cutoffTime = Date.now() - maxAgeMinutes * 60000;
//   const initialCount = devices.value.length;

//   devices.value = devices.value.filter(
//     (device) => device.lastSeen > cutoffTime
//   );

//   const removedCount = initialCount - devices.value.length;
//   if (removedCount > 0) {
//     console.log(
//       `Cleaned up ${removedCount} old devices (older than ${maxAgeMinutes} minutes)`
//     );
//   }
// };

// // Start periodic cleanup
// export const startPeriodicCleanup = (
//   intervalMs: number = CLEANUP_INTERVAL_MS,
//   maxAgeMinutes: number = DEFAULT_MAX_AGE_MINUTES
// ): void => {
//   stopPeriodicCleanup(); // Clear any existing timer

//   cleanupTimer = setInterval(() => {
//     cleanupOldDevices(maxAgeMinutes);
//   }, intervalMs);

//   console.log(
//     `Started periodic device cleanup every ${intervalMs / 1000}s (max age: ${maxAgeMinutes}min)`
//   );
// };

// // Stop periodic cleanup
// export const stopPeriodicCleanup = (): void => {
//   if (cleanupTimer) {
//     clearInterval(cleanupTimer);
//     cleanupTimer = null;
//     console.log("Stopped periodic device cleanup");
//   }
// };

// Helper function to decode manufacturer data based on manufacturer ID
const decodeSensor = (result: ScanResult): Record<string, any> => {
  const decoded: Record<string, any> = {};

  // Handle service data first (for devices like BTHome that use service UUIDs)
  if (result.serviceData) {
    for (const serviceUUID in result.serviceData) {
      // Check if this is a known service UUID
      if (serviceUUID in allowedServiceUUIDs) {
        const serviceInfo =
          allowedServiceUUIDs[serviceUUID as keyof typeof allowedServiceUUIDs];
        switch (serviceUUID) {
          case "0000fcd2-0000-1000-8000-00805f9b34fb": // BTHome-V2
            decoded.type = serviceInfo.type;
            decoded.sortingPriority = serviceInfo.sortingPriority;
            decoded.serviceUUID = serviceUUID;
            decoded.value = decodeBTHome(result.serviceData[serviceUUID]);
            return decoded; // Return early since we found service data
        }
      }
    }
  }

  // Handle manufacturer data (existing logic)
  if (!result.manufacturerData) {
    return decoded;
  }

  for (const [manufacturerIdStr, dataView] of Object.entries(
    result.manufacturerData
  )) {
    const manufacturerId = parseInt(manufacturerIdStr, 10);
    const manufacturerInfo =
      allowedManufacturerIds[
        manufacturerId as keyof typeof allowedManufacturerIds
      ];

    if (manufacturerInfo) {
      decoded.type = manufacturerInfo.type;
      decoded.sortingPriority = manufacturerInfo.sortingPriority;
      const existingDevice = devices.value.get(result.device.deviceId);
      const previousValue = existingDevice?.decoded?.value || {};
      // Decode based on the type
      switch (manufacturerInfo.type) {
        case "Otodata":
          decoded.value = {
            ...previousValue,
            ...parseOtodata(dataView),
          };
          break;
        case "Ruuvi":
          decoded.value = parseRuuvi(dataView);
          break;
        case "Mopeka":
          decoded.value = parseMopeka(dataView);
          break;
        case "Rotarex":
          decoded.value = parseMystery(dataView);
          break;
        case "TPMS1":
          decoded.value = parseTPMS00AC(dataView);
          break;
        case "TPMS4":
          decoded.value = parseTPMS0100(dataView);
          break;
        case "MikroTik":
          decoded.value = parseMikrotik(dataView);
          break;
        default:
          decoded.type = "Unknown";
          break;
      }
    } else {
      decoded.type = "Unknown";
    }
  }

  return decoded;
};

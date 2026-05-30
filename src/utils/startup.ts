import { KeepAwake } from "@capacitor-community/keep-awake";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

import { ref, watch } from "vue";
import { startLocation, stopLocation } from "../sensors/location";
import { startBarometer, stopBarometer } from "../sensors/barometer";
import { showDebugInfo, preferredBroker } from "../composables/useAppState";
import { useAppLifecycle } from "../composables/useAppLifecycle";
import {
  initializeAndStartBLEScan,
  startBLEScan,
  cleanupBLE,
} from "../sensors/blesensors";
import {
  startNetworkObserver,
  stopNetworkObserver,
  networkStatus,
} from "../sensors/network";
import { useMqttConnection } from "../composables/useMqttConnection";
import { useMdnsScan } from "../composables/useMdnsScan";
import { startTimer, stopTimer } from "./ticker";
import { Share } from "@capacitor/share";
import QRCode from "qrcode";
// import { startScan } from "@/sensors/mdns";

const isWeb = Capacitor.getPlatform() === "web";
const wakeLockAvailable = ref(false);

const logDeviceInfo = async () => {
  const info = await Device.getInfo();
  console.log(info);
};

const logBatteryInfo = async () => {
  const info = await Device.getBatteryInfo();
  console.log(info);
};

const getDeviceId = async () => {
  try {
    const { identifier } = await Device.getId();
    console.log("Device Unique ID:", identifier);
    return identifier;
  } catch (error) {
    console.error("Error fetching device ID:", error);
  }
};

// Debug info visibility - imported directly from centralized app state

const isSupported = async () => {
  const result = await KeepAwake.isSupported();
  return result.isSupported;
};

const isKeptAwake = async () => {
  const result = await KeepAwake.isKeptAwake();
  return result.isKeptAwake;
};

// --- Auto-connect logic ---

let retryTimer: ReturnType<typeof setTimeout> | null = null;

const clearRetry = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const connectAutomatic = () => {
  const { connect, autoConnectActive } = useMqttConnection();
  const broker = preferredBroker.value;
  if (!broker?.autoConnect) {
    autoConnectActive.value = false;
    clearRetry();
    return;
  }
  autoConnectActive.value = true;
  clearRetry();
  // preferredBroker.host/port is kept fresh by the continuous mDNS scan
  connect(broker);
};

const cameToForeground = async () => {
  console.log("App is in the foreground");
  startBarometer();
  startLocation();
  startTimer();
  if (!isWeb) {
    // Restart BLE scanning when app comes to foreground
    try {
      await startNetworkObserver();
    } catch (e) {
      console.error("Failed to start startNetworkObserver in foreground:", e);
    }
    try {
      await startBLEScan();
    } catch (e) {
      console.error("Failed to start BLE scanning in foreground:", e);
    }
  }
  if (wakeLockAvailable.value) {
    if (!(await isKeptAwake())) {
      console.log("Keeping the app awake");
      await KeepAwake.keepAwake();
    }
  }
  useMdnsScan().startScan();
  useMqttConnection().resume();
};

const wentToBackground = async () => {
  console.log("App is in the background");
  stopBarometer();
  stopTimer();
  stopLocation();
  if (!isWeb) {
    // Stop BLE scanning when app goes to background to save battery
    try {
      await cleanupBLE();
    } catch (e) {
      console.error("Failed to cleanup BLE in background:", e);
    }
    stopNetworkObserver();
  }
  if (wakeLockAvailable.value) {
    if (await isKeptAwake()) {
      console.log("letting the app sleep");
      await KeepAwake.allowSleep();
    }
  }
  useMdnsScan().stopScan();
  useMqttConnection().pause();
  clearRetry();
};

const shareData = async () => {
  await Share.share({
    title: "Shared Content",
    text: "Check this out!",
    url: "https://example.com",
    dialogTitle: "Share with",
  });
};

// Function to generate QR code as a data URL
const generateQRCode = async (text: string): Promise<string> => {
  try {
    // Generate QR code as a data URL (base64-encoded PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H", // High error correction
      width: 300, // Size of the QR code
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

// Function to share the QR code
const shareQRCode = async (text: string) => {
  try {
    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCode(text);
    console.log(qrCodeDataUrl);

    // Share the QR code
    await Share.share({
      title: "My QR Code",
      text: "Scan this QR code",
      url: qrCodeDataUrl, // Data URL of the QR code image
      dialogTitle: "Share QR Code", // Used on Android
    });
  } catch (error) {
    console.error("Error sharing QR code:", error);
  }
};
const initializeApp = async () => {
  console.log("Initializing app...");
  console.log("git sha: ", __GIT_COMMIT_HASH__);
  console.log("git branch: ", __GIT_BRANCH_NAME__);
  console.log("build Date: ", __VITE_BUILD_DATE__);
  console.log("App version: ", __APP_VERSION__);
  wakeLockAvailable.value = await isSupported();
  console.log(`Wake lock supported: ${wakeLockAvailable.value}`);

  // await logDeviceInfo();
  // await logBatteryInfo();
  // await getDeviceId();
  // await shareData();
  // await shareQRCode("https://static.mah.priv.at/apps/flightview");

  startLocation();
  startBarometer();

  // Handle app state changes
  const { isActive } = useAppLifecycle();
  watch(isActive, (active) => {
    if (active) {
      console.log("App is in the foreground");
      cameToForeground();
    } else {
      console.log("App is in the background");
      wentToBackground();
    }
  });

  // Auto-connect watchers
  const { connectionState, autoConnectActive } = useMqttConnection();

  watch(
    preferredBroker,
    (broker) => {
      if (broker?.autoConnect) connectAutomatic();
      else {
        clearRetry();
        autoConnectActive.value = false;
      }
    },
    { immediate: true },
  );

  watch(connectionState, (state) => {
    if (!preferredBroker.value?.autoConnect) return;
    if (state === "disconnected") {
      autoConnectActive.value = true;
      clearRetry();
      retryTimer = setTimeout(() => connectAutomatic(), 15000);
    } else if (state === "connected") {
      clearRetry();
    }
  });

  watch(networkStatus, (status, prev) => {
    if (status?.connected && !prev?.connected) {
      useMdnsScan().restartScan();
      if (preferredBroker.value?.autoConnect) {
        useMqttConnection().disconnect();
        retryTimer = setTimeout(() => connectAutomatic(), 1000);
      }
    }
  });

  if (!isWeb) {
    // Initialize BLE scanning
    try {
      initializeAndStartBLEScan();
    } catch (e) {
      console.error("Failed to initialize BLE scanning:", e);
    }
    try {
      await startNetworkObserver();
    } catch (e) {
      console.error("Failed to start startNetworkObserver in foreground:", e);
    }
    useMdnsScan().startScan();
  }
  startTimer();
  // console.log('Network status:', networkStatus.value?.connected, networkStatus.value?.connectionType);
  console.log("App initialized and ready to use.");
};

export { initializeApp, wakeLockAvailable, showDebugInfo };

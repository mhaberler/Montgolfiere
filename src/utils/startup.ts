import { App } from "@capacitor/app";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Capacitor } from "@capacitor/core";
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';

import { ref } from "vue";
import { startLocation, stopLocation } from "../sensors/location";
import { startBarometer, stopBarometer } from "../sensors/barometer";
import { usePersistedRef } from "../composables/usePersistedRef";
import { initializeAndStartBLEScan, startBLEScan, cleanupBLE } from '../sensors/blesensors';
import {
  startTimer,
  stopTimer,
} from "./ticker";
const isWeb = Capacitor.getPlatform() === "web";

const wakeLockAvailable = ref(false);

Network.addListener('networkStatusChange', status => {
  console.log('Network status changed', status);
});

const logCurrentNetworkStatus = async () => {
  const status = await Network.getStatus();

  console.log('Network status:', status);
};

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
    console.log('Device Unique ID:', identifier);
    return identifier;
  } catch (error) {
    console.error('Error fetching device ID:', error);
  }
};

const showDebugInfo = usePersistedRef<boolean>(
  "showDebugInfo",
  import.meta.env.MODE === "development"
);

const isSupported = async () => {
  const result = await KeepAwake.isSupported();
  return result.isSupported;
};

const isKeptAwake = async () => {
  const result = await KeepAwake.isKeptAwake();
  return result.isKeptAwake;
};

const cameToForeground = async () => {
  console.log("App is in the foreground");
  startBarometer();
  startLocation();
  startTimer();
  if (!isWeb) {
    // Restart BLE scanning when app comes to foreground
    try {
      await startBLEScan();
    } catch (e) {
      console.error('Failed to start BLE scanning in foreground:', e);
    }
  }
  if (wakeLockAvailable.value) {
    if (!(await isKeptAwake())) {
      console.log("Keeping the app awake");
      await KeepAwake.keepAwake();
    }
  }
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
      console.error('Failed to cleanup BLE in background:', e);
    }
  }
  if (wakeLockAvailable.value) {
    if (await isKeptAwake()) {
      console.log("letting the app sleep");
      await KeepAwake.allowSleep();
    }
  }
};

import { Share } from '@capacitor/share';
import QRCode from 'qrcode';

const shareData = async () => {
  await Share.share({
    title: 'Shared Content',
    text: 'Check this out!',
    url: 'https://example.com',
    dialogTitle: 'Share with',
  });
};

// Function to generate QR code as a data URL
const generateQRCode = async (text: string): Promise<string> => {
  try {
    // Generate QR code as a data URL (base64-encoded PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H', // High error correction
      width: 300, // Size of the QR code
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

// Function to share the QR code
const shareQRCode = async (text: string) => {
  try {
    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCode(text);
    console.log(qrCodeDataUrl)


    // Share the QR code
    await Share.share({
      title: 'My QR Code',
      text: 'Scan this QR code',
      url: qrCodeDataUrl, // Data URL of the QR code image
      dialogTitle: 'Share QR Code', // Used on Android
    });
  } catch (error) {
    console.error('Error sharing QR code:', error);
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

  // Handle app state changes
  App.addListener("appStateChange", (state) => {
    if (state.isActive) {
      console.log("App is in the foreground");
      cameToForeground();
    } else {
      console.log("App is in the background");
      wentToBackground();
    }
  });
  await startLocation();
  await startBarometer();
  if (!isWeb) {
    // Initialize BLE scanning
    try {
      await initializeAndStartBLEScan();
    } catch (e) {
      console.error('Failed to initialize BLE scanning:', e);
    }
  }
  startTimer();

  console.log("App initialized and ready to use.");
};

export {
  initializeApp,
  wakeLockAvailable,
  showDebugInfo,
};

import { App } from "@capacitor/app";
import { KeepAwake } from "@capacitor-community/keep-awake";
// import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Capacitor } from "@capacitor/core";

import { ref, computed } from "vue";
import { startLocation, stopLocation } from "../sensors/location";
import { usePersistedRef } from "../composables/usePersistedRef";
import { initializeAndStartBLEScan, cleanupBLE } from '../sensors/blesensors';
import {
  startTimer,
  stopTimer,
} from "./ticker";

const wakeLockAvailable = ref(false);
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
  startLocation();
  startTimer();
  // Restart BLE scanning when app comes to foreground
  try {
    await initializeAndStartBLEScan();
  } catch (e) {
    console.error('Failed to start BLE scanning in foreground:', e);
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
  stopTimer();
  stopLocation();
  // Stop BLE scanning when app goes to background to save battery
  try {
    await cleanupBLE();
  } catch (e) {
    console.error('Failed to cleanup BLE in background:', e);
  }
  
  if (wakeLockAvailable.value) {
    if (await isKeptAwake()) {
      console.log("letting the app sleep");
      await KeepAwake.allowSleep();
    }
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
  startLocation();
  // Initialize BLE scanning
  try {
    await initializeAndStartBLEScan();
  } catch (e) {
    console.error('Failed to initialize BLE scanning:', e);
  }
  startTimer();

  console.log("App initialized and ready to use.");
};

export {
  initializeApp,
  wakeLockAvailable,
  showDebugInfo,
};

import { App } from "@capacitor/app";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Toast } from "@capacitor/toast";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Capacitor } from "@capacitor/core";

import { ref, computed } from "vue";
import { startLocation } from "../sensors/location";
import { usePersistedRef } from "../composables/usePersistedRef";
// import { initializeBLE } from '../sensors/blesensors';



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
  if (wakeLockAvailable.value) {
    if (!(await isKeptAwake())) {
      console.log("Keeping the app awake");
      await KeepAwake.keepAwake();
    }
  }
};

const wentToBackground = async () => {
  console.log("App is in the background");
  if (wakeLockAvailable.value) {
    if (await isKeptAwake()) {
      console.log("letting the app sleep");
      await KeepAwake.allowSleep();
    }
  }
};

const isNativePlatform = computed(() => {
  return Capacitor.isNativePlatform();
});


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
  // initializeBLE();
  console.log("App initialized and ready to use.");
};

export { initializeApp, wakeLockAvailable, showDebugInfo, isNativePlatform };

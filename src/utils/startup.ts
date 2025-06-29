import { App } from "@capacitor/app";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { Toast } from "@capacitor/toast";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { ref } from "vue";
import { startBarometer } from "../sensors/pressure";
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

const initializeApp = async () => {
  console.log("Initializing app...");
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
  startBarometer();
  startLocation();
  // initializeBLE();
  console.log("App initialized and ready to use.");
};

export { initializeApp, wakeLockAvailable, showDebugInfo };

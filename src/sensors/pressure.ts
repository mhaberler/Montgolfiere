import { ref, watch } from "vue";
import { Capacitor } from "@capacitor/core";

import { MockBarometer } from "../simulated/MockBarometer";
import { Barometer } from "capacitor-barometer";

import type { PluginListenerHandle } from "@capacitor/core";

import { altitudeByPressure, isaToQnhAltitude } from "../utils/meteo-utils";
import { usePersistedRef } from "@/composables/usePersistedRef";
import {
  // isNativePlatform,
  isIOSPlatform,
  isAndroidPlatform,
  isWebPlatform,
} from "@/utils/state";

import { Kalman } from "../ekf/kalman";

import { RateStats } from "../stats/RateStats";
import { number } from "mathjs";

interface BarometerAvailable {
  available: boolean;
}

interface BarometerData {
  pressure: number;
  timestamp: number;
}

// persistent config state - automatically restored from Capacitor Preferences
const pressureQNH = usePersistedRef<number>("pressureQNH", 1013.25); // aka QNH in hPa, default is 1013.25 hPa (sea level standard atmospheric pressure)
const transitionAltitude = usePersistedRef<number>("transitionAltitude", 7000); // altitude in ft where we transition from QNH to ISA model
const historySamples = usePersistedRef<number>(
  "historySamples",
  20); // variance window

// volatile state
// Sensor source selection
const sensorSource = ref(Capacitor.isNativePlatform() ? 'native' : 'simulated');

const barometerAvailable = ref<boolean>(false);
const baroActive = ref(false);
const pressure = ref<number>(1013.25);
const rawAltitudeISA = ref<number>(0.0);
const currentVariance = ref<number>(0.0);
const baroRate = ref<number>(0.0);

const ekfAltitudeISA = ref<number>(0);
const ekfAltitudeQNH = ref<number>(0);
const ekfVelocity = ref<number>(0);
const ekfAcceleration = ref<number>(0);
const ekfBurnerGain = ref<number>(0);
const ekfIsDecelerating = ref<boolean>(false);
const ekfTimeToZeroSpeed = ref<number>(0);
const ekfZeroSpeedAltitude = ref<number>(0);
const ekfZeroSpeedValid = ref<boolean>(false);

let baroListener: PluginListenerHandle;
let barometer: any;

const ekf = new Kalman();
const rateStats = new RateStats();

let previousTimestamp = 0; // seconds/ Unix timestamp

// Watcher with immediate option - runs immediately on setup
watch(
  historySamples,
  (newSampleCount) => {
    console.log(`historySamples: ${newSampleCount}`);
    ekf.setVarianceHistoryWindow(newSampleCount);
  },
  { immediate: true }
);


watch(
  sensorSource,
  (newSource) => {
    console.log(`sensorSource: ${newSource}`);
    switchSource(newSource);
  },
   { immediate: true }
);

// function bestWindowSize() : number {
//   if (isIOSPlatform) return 5;
//   if (isAndroidPlatform) return 5*7;
//   if (isWebPlatform) return 5 * 4;;
//   return 20;
// };


async function switchSource(source: string) {
  console.log(`setting barometer source to ${source}`);
  await stopBarometer();
  switch (source) {
    case "native":
      barometer = Barometer;
      await startBarometer();
      break;
    case "simulated":
      barometer = new MockBarometer();
      await startBarometer();
      break;
    // case "mqtt":
    //   return "Deleting...";
    // case "logfile":
    //   return "Deleting...";
    default:
      throw new Error(`Unhandled source: ${source}`);
  }
}

async function startBarometer() {
  try {
    const result = (await barometer.isAvailable()) as BarometerAvailable;
    barometerAvailable.value = result.available;
    
    if (!barometerAvailable.value) {
      console.warn('Barometer is not available on this device');
      return;
    }

    if (barometerAvailable.value && !baroActive.value) {
      baroListener = await barometer.addListener(
        "onPressureChange",
        (data: BarometerData) => {
          rateStats.push();
          baroRate.value = rateStats.averageRate();
          pressure.value = data.pressure;
    
          const altISA = altitudeByPressure(pressure.value, 1013.25);
          if (altISA === undefined) {
            return;
          }
          rawAltitudeISA.value = altISA;

          if (previousTimestamp > 0) {
            const timeDiff = data.timestamp - previousTimestamp;
            ekf.altitudeSample(timeDiff, altISA, 0, 0);
            currentVariance.value = ekf.currentVariance();
            ekfAltitudeISA.value = ekf.getAltitude();
            ekfAltitudeQNH.value = isaToQnhAltitude(ekf.getAltitude(), pressureQNH.value);
            ekfVelocity.value = ekf.getVelocity();
            ekfAcceleration.value = ekf.getAcceleration();
            ekfBurnerGain.value = ekf.getBurnerGain();
            const deceleration = ekf.isDecelerating();
            ekfIsDecelerating.value = deceleration.isDecelerating;
            ekfTimeToZeroSpeed.value = deceleration.timeToZeroSpeed;
            const zeroSpeed = ekf.getZeroSpeedAltitude();
            ekfZeroSpeedAltitude.value = zeroSpeed.altitude;
            ekfZeroSpeedValid.value = zeroSpeed.valid;
          }
          previousTimestamp = data.timestamp;
        }
      );
      await barometer.start();
      baroActive.value = true;
      console.log('Barometer started successfully');
    }
  } catch (error) {
    console.error('Failed to start barometer:', error);
    barometerAvailable.value = false;
    baroActive.value = false;
    
    // If we're on iOS and the barometer is not implemented, switch to simulated mode
    if (isIOSPlatform && error instanceof Error && error.message && error.message.includes('not implemented')) {
      console.log('Barometer not implemented on iOS, switching to simulated mode');
      sensorSource.value = 'simulated';
    }
  }
}

async function stopBarometer() {
  if (!baroActive.value) return;
  
  try {
    await barometer.stop();
    if (baroListener) {
      await baroListener.remove();
    }
    baroActive.value = false;
    console.log('Barometer stopped successfully');
  } catch (error) {
    console.error('Failed to stop barometer:', error);
    // Still set as inactive even if stop failed
    baroActive.value = false;
  }
}

export {
  pressureQNH,
  transitionAltitude,
  historySamples,
  // volatile state
  barometerAvailable,
  baroActive,
  pressure,
  rawAltitudeISA,
  ekfAltitudeISA,
  ekfAltitudeQNH,
  ekfVelocity,
  ekfAcceleration,
  ekfBurnerGain,
  ekfIsDecelerating,
  ekfTimeToZeroSpeed,
  ekfZeroSpeedAltitude,
  ekfZeroSpeedValid,
  currentVariance,
  baroRate,
  sensorSource,
};

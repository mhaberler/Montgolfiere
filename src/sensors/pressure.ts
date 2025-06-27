import { ref } from 'vue';

import { Barometer } from 'capacitor-barometer';
import type { PluginListenerHandle } from '@capacitor/core';

import { altitudeByPressure } from '../utils/meteo-utils';
import { usePersistedRef } from '@/composables/usePersistedRef';
import BalloonEKF from '../ekf/BalloonEKF';

import { RunningVariance } from "../stats/RunningVariance";
import { RateStats } from "../stats/RateStats";
// import { WindowVariance } from "../stats/WindowVariance";

interface BarometerAvailable {
    available: boolean;
}

// persistent config state - automatically restored from Capacitor Preferences
const referencePressure = usePersistedRef<number>('referencePressure',1013.25);  // aka QNH in hPa, default is 1013.25 hPa (sea level standard atmospheric pressure)
const useReferencePressure = usePersistedRef('useReferencePressure', false);  // for ekf only
const transitionAltitude = usePersistedRef<number>('transitionAltitude', 7000); // altitude in ft where we transition from QNH to ISA model
const historySamples = usePersistedRef<number>('historySamples', 20); // variance time window

// volatile state
const barometerAvailable = ref<boolean>(false);
const baroActive = ref(false);
const pressure = ref<number>(1013.25);
const altitudeQNH = ref<number>(0.0);
const altitudeISA = ref<number>(0.0);
const currentVariance = ref<number>(0.0);
const baroRate = ref<number>(0.0);

const ekfAltitude = ref<number>(0);
const ekfVelocity = ref<number>(0);
const ekfAcceleration = ref<number>(0);
const ekfBurnerGain = ref<number>(0);
const ekfIsDecelerating = ref<boolean>(false);
const ekfTimeToZeroSpeed = ref<number>(0);
const ekfZeroSpeedAltitude = ref<number>(0);
const ekfZeroSpeedValid = ref<boolean>(false);

let baroListener: PluginListenerHandle;

const ekf = new BalloonEKF();
const rv = new RunningVariance();
const rateStats = new RateStats();

let previousTimestamp = 0;  // seconds/ Unix timestamp

if (import.meta.env.MODE === "development") {
  // dev-only logic
}

const startBarometer = async () => {
    const result = await Barometer.isAvailable() as BarometerAvailable;
    barometerAvailable.value = result.available;

    if (barometerAvailable.value && !baroActive.value) {
        baroListener = Barometer.addListener('onPressureChange', (data) => {
          rateStats.push();
          baroRate.value = rateStats.averageRate();

          pressure.value = data.pressure;
          const altQNH = altitudeByPressure(
            pressure.value,
            referencePressure.value
          );
          altitudeQNH.value = altQNH !== undefined ? altQNH : 0.0;
          const altISA = altitudeByPressure(pressure.value, 1013.25);
          altitudeISA.value = altISA !== undefined ? altISA : 0.0;

          if (previousTimestamp > 0) {
            const timeDiff = data.timestamp - previousTimestamp;
            const loudness = 0.0;
            const burnerDuration = 0.0;
            const p = useReferencePressure.value
              ? altitudeQNH.value
              : altitudeISA.value;
            rv.push(p);
            currentVariance.value = rv.variance();
            ekf.setVariance(currentVariance.value);
            ekf.processMeasurement(
              timeDiff,
              useReferencePressure.value
                ? altitudeQNH.value
                : altitudeISA.value,
              loudness,
              burnerDuration
            );

            ekfAltitude.value = ekf.getAltitude();
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
        });
        await Barometer.start();
        baroActive.value = true;
    }
};

const stopBarometer = async () => {
    if (!baroActive.value) return;
    await Barometer.stop();
    if (baroListener) {
        await baroListener.remove();
    }
    baroActive.value = false;
};

export {
  referencePressure,
  useReferencePressure,
  transitionAltitude,
  historySamples,
  startBarometer,
  stopBarometer,

  // volatile state
  barometerAvailable,
  baroActive,
  pressure,
  altitudeQNH,
  altitudeISA,
  ekfAltitude,
  ekfVelocity,
  ekfAcceleration,
  ekfBurnerGain,
  ekfIsDecelerating,
  ekfTimeToZeroSpeed,
  ekfZeroSpeedAltitude,
  ekfZeroSpeedValid,
  currentVariance,
  baroRate,
};
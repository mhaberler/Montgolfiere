import { ref, watch, computed } from 'vue'
import { Capacitor } from '@capacitor/core'

import { usePersistedRef } from '@/composables/usePersistedRef'
import { currentQNH } from '../process/qnh'
import { altitudeByPressure, isaToQnhAltitude } from '../utils/meteo-utils'
import { Kalman } from '../ekf/kalman'

const platformEnv = import.meta.env.VITE_CAPACITOR_PLATFORM

// persistent config state - automatically restored from Capacitor Preferences
const transitionAltitude = usePersistedRef<number>('transitionAltitude', 7000) // altitude in ft where we transition from QNH to ISA model
const historySamples = usePersistedRef<number>(
  'historySamples',
  platformEnv == 'ios' || platformEnv == 'web' ? 5 : 35,
)

// Platform-specific default: iOS/web = 1, Android = 5
const getDefaultDecimation = (): number => {
  return Capacitor.getPlatform() === 'android' ? 5 : 1
}

// Add a sample counter
let sampleCounter = 0

// Make decimate pressure samples persistent with platform-specific default
const decimateEKFSamples = usePersistedRef<number>('decimateEKFSamples', getDefaultDecimation())

const pressure = ref<number>(1013.25)
const rawAltitudeISA = ref<number>(0.0)
const currentVariance = ref<number>(0.0)

const ekfAltitudeISA = ref<number>(0)
const ekfAltitudeQNH = ref<number>(0)
const ekfVelocity = ref<number>(0)
const ekfAcceleration = ref<number>(0)
const ekfBurnerGain = ref<number>(0)
const ekfIsDecelerating = ref<boolean>(false)
const ekfTimeToZeroSpeed = ref<number>(0)
const ekfZeroSpeedAltitude = ref<number>(0)
const ekfZeroSpeedValid = ref<boolean>(false)

const ekfVspeedStdDev = ref<number>(0)
const ekfVaccelStdDev = ref<number>(0)

const ekf = new Kalman()

let previousTimestamp = 0 // seconds/ Unix timestamp

// Watcher with immediate option - runs immediately on setup
watch(
  historySamples,
  (newSampleCount) => {
    console.log(`historySamples: ${newSampleCount}`)
    ekf.setAltitudeVarianceHistoryWindow(newSampleCount)
    ekf.setVspeedStdDevHistoryWindow(newSampleCount)
    ekf.setVaccelStdDevHistoryWindow(newSampleCount)
  },
  { immediate: true },
)

function processPressureSample(p: number, t: number) {
  pressure.value = p

  const altISA = altitudeByPressure(pressure.value, 1013.25)
  if (!altISA) {
    return
  }
  rawAltitudeISA.value = altISA

  if (previousTimestamp > 0) {
    const timeDiff = t - previousTimestamp
    ekf.altitudeSample(timeDiff, altISA, 0, 0)
    sampleCounter++
    if (sampleCounter >= decimateEKFSamples.value) {
      currentVariance.value = ekf.currentVariance()
      ekfAltitudeISA.value = ekf.getAltitude()
      ekfAltitudeQNH.value = isaToQnhAltitude(ekf.getAltitude(), currentQNH.value)
      ekfVelocity.value = ekf.getVelocity()
      ekfAcceleration.value = ekf.getAcceleration()
      ekfBurnerGain.value = ekf.getBurnerGain()
      const deceleration = ekf.isDecelerating()
      ekfIsDecelerating.value = deceleration.isDecelerating
      ekfTimeToZeroSpeed.value = deceleration.timeToZeroSpeed
      const zeroSpeed = ekf.getZeroSpeedAltitude()
      ekfZeroSpeedAltitude.value = zeroSpeed.altitude
      ekfZeroSpeedValid.value = zeroSpeed.valid
      ekfVspeedStdDev.value = ekf.vspeedstandardDeviation()
      ekfVaccelStdDev.value = ekf.vaccelstandardDeviation()
      sampleCounter = 0 // Reset counter
    }
  }
  previousTimestamp = t
}

const zCI95 = 1.96
// const zCI99 = 2.576;

const vspeedCI95 = computed(() => {
  return {
    lower: ekfVelocity.value - zCI95 * ekfVspeedStdDev.value,
    upper: ekfVelocity.value + zCI95 * ekfVspeedStdDev.value,
  }
})
const vaccelCI95 = computed(() => {
  return {
    lower: ekfAcceleration.value - zCI95 * ekfVaccelStdDev.value,
    upper: ekfAcceleration.value + zCI95 * ekfVaccelStdDev.value,
  }
})

export {
  transitionAltitude,
  historySamples,
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
  ekfVaccelStdDev,
  ekfVspeedStdDev,
  currentVariance,
  vspeedCI95,
  vaccelCI95,
  processPressureSample,
  decimateEKFSamples,
}

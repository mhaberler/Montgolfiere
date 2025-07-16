// consolidate the state management for barometer and location sensors
import {
  // persistent state
  pressureQNH,
  transitionAltitude,
  historySamples,

  // volatile
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
  ekfVspeedStdDev,
  ekfVaccelStdDev,
  currentVariance,
  baroRate,
  sensorSource,
  vspeedCI95,
  vaccelCI95,
} from "../sensors/pressure";

import {
  locationAvailable,
  location,
  locationError,
} from "../sensors/location";

import {
  bleScanTimeouts,
  resetbleScanTimeouts,
  bleInitErrors,
  bleAdvertisements,
  bleDeviceUpdates,
  bleScanStarts,
  bleScanErrors,
  bleErrorMsg,
  devices,
  isScanning,
  restartBLEScan,
  clearBLEDevices,
} from "../sensors/blesensors";

import {
  wakeLockAvailable,
  showDebugInfo,
  isNativePlatform,
  isIOSPlatform,
  isAndroidPlatform,
  isWebPlatform,
} from "./startup";

import {
  startTimer,
  stopTimer,
  ticker,
  tickerRunning
} from "../utils/ticker";

export {
  // persistent state
  pressureQNH,
  transitionAltitude,
  historySamples,
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
  ekfVspeedStdDev,
  ekfVaccelStdDev,
  vspeedCI95,
  vaccelCI95,
  currentVariance,
  baroRate,
  locationAvailable,
  location,
  locationError,
  wakeLockAvailable,
  showDebugInfo,
  sensorSource,
  isNativePlatform,
  isIOSPlatform,
  isAndroidPlatform,
  isWebPlatform,
  bleScanTimeouts,
  resetbleScanTimeouts,
  bleInitErrors,
  bleAdvertisements,
  bleDeviceUpdates,
  bleScanStarts,
  bleScanErrors,
  bleErrorMsg,
  devices,
  isScanning,
  restartBLEScan,
  clearBLEDevices,
  startTimer,
  stopTimer,
  ticker,
  tickerRunning
};

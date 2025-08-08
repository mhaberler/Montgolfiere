// consolidate the state management for barometer and location sensors
import {
  // persistent state

  // volatile
  barometerAvailable,
  baroActive,
  
  baroRate,

} from "../sensors/barometer";

import {
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
  processPressureSample
} from "../process/pressure";

import {
  locationAvailable,
  location,
  locationError,
  startLocation,
  stopLocation,
  elevation,
  demLookup,
  demUrl,
  demInfo
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
  showDebugInfo
} from "./startup";

import {
  startTimer,
  stopTimer,
  ticker,
  tickerRunning
} from "../utils/ticker";

export {
  // persistent state
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
  processPressureSample,
  baroRate,
  locationAvailable,
  location,
  locationError,
  startLocation,
  stopLocation,
  elevation,
  demLookup,
  demUrl,
  demInfo,
  wakeLockAvailable,
  showDebugInfo,
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
  tickerRunning,
  
};

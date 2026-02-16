// consolidate the state management for barometer and location sensors
import {
  // persistent state

  // volatile
  barometerAvailable,
  baroActive,

  baroRate,

} from "../sensors/barometer";

import {
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
  wakeLockAvailable
} from "./startup";

import {
  startTimer,
  stopTimer,
  ticker,
  tickerRunning
} from "../utils/ticker";

export {
  // volatile state only - persisted vars moved to useAppState
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
  tickerRunning,};
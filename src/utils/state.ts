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
  currentVariance,
  baroRate,
  sensorSource
} from "../sensors/pressure";

import {
  locationAvailable,
  location,
  locationError,
} from "../sensors/location";

import { wakeLockAvailable, showDebugInfo } from "./startup";

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
  currentVariance,
  baroRate,
  locationAvailable,
  location,
  locationError,
  wakeLockAvailable,
  showDebugInfo,
  sensorSource,
};

// consolidate the state management for barometer and location sensors
import {
  // persistent state
  referencePressure,
  useReferencePressure,
  transitionAltitude,
  historySeconds,

  // volatile
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
} from "../sensors/pressure";

import {
    locationAvailable,
    location,
    locationError,
} from '../sensors/location';

import { wakeLockAvailable, showDebugInfo } from "./startup";

export {
  // persistent state
  referencePressure,
  useReferencePressure,
  transitionAltitude,
  historySeconds,
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
  locationAvailable,
  location,
  locationError,
  wakeLockAvailable,
  showDebugInfo,
};

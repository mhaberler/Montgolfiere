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
} from "../sensors/pressure";

import {
    locationAvailable,
    location,
    locationError,
} from '../sensors/location';

import {
    wakeLockAvailable
} from './startup';

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

    locationAvailable,
    location,
    locationError,

    wakeLockAvailable
}

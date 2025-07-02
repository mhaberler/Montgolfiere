// in honor of Hilmar Lorenz
// https://www.hlballon.com/brennersteuerung.php

import BalloonEKF from "./BalloonEKF";
import { WindowVariance } from "../stats/WindowVariance";
import { forEach } from "mathjs";

interface KalmanInterface {
  altitudeSample(
    dt: number,
    altitude: number,
    loudness: number,
    duration: number
  ): void;
  setVarianceHistoryWindow(samples: number): void;
  currentVariance(): number;
  setAltitude(altitude: number): void;
}

export class Kalman extends BalloonEKF implements KalmanInterface {
  private varianceHistory: WindowVariance;
  private windowSize: number = 5;
  private windowVariance = 0;

  constructor() {
    super();
    this.varianceHistory = new WindowVariance(this.windowSize);
  }

  altitudeSample(
    deltaT: number,
    altitude: number,
    loudness: number = 0,
    duration: number = 0
  ) {
    this.varianceHistory.add(altitude);
    this.windowVariance = this.varianceHistory.variance();
    this.setVariance(this.windowVariance);
    this.processMeasurement(deltaT, altitude, loudness, duration);
  }

  setVarianceHistoryWindow(samples: number) {
    this.windowSize = samples;
    this.varianceHistory = new WindowVariance(this.windowSize);
  }

  currentVariance(): number {
    return this.windowVariance;
  }

  // prime the KF to quickly converge once real samples come
  setAltitude(altitude: number): void {
    for (let i = 0; i < this.windowSize; i++) {
      this.altitudeSample(i, altitude);
    }
  }
}

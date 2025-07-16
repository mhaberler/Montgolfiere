// in honor of Hilmar Lorenz
// https://www.hlballon.com/brennersteuerung.php

import BalloonEKF from "./BalloonEKF";
import { WindowVariance } from "../stats/WindowVariance";

interface KalmanInterface {
  altitudeSample(
    dt: number,
    altitude: number,
    loudness: number,
    duration: number
  ): void;
  setAltitudeVarianceHistoryWindow(samples: number): void;
  setVspeedStdDevHistoryWindow(samples: number): void;
  setVaccelStdDevHistoryWindow(samples: number): void;
  currentVariance(): number;
  setAltitude(altitude: number): void;
  vspeedstandardDeviation(): number;
  vaccelstandardDeviation(): number;
}

export class Kalman extends BalloonEKF implements KalmanInterface {
  private altiudeVarianceHistory: WindowVariance;
  private vspeedHistory: WindowVariance;
  private vaccelHistory: WindowVariance;
  private altiudeVarianceWindowSize: number = 5;
  private vspeedHistoryWindowSize: number = 5;
  private vaccelHistoryWindowSize: number = 5;
  private windowedAltiudeVariance = 0;

  constructor() {
    super();
    this.altiudeVarianceHistory = new WindowVariance(this.altiudeVarianceWindowSize);
    this.vspeedHistory = new WindowVariance(this.vspeedHistoryWindowSize);
    this.vaccelHistory = new WindowVariance(this.vaccelHistoryWindowSize);
  }

  altitudeSample(
    deltaT: number,
    altitude: number,
    loudness: number = 0,
    duration: number = 0
  ) {
    this.altiudeVarianceHistory.add(altitude);
    this.windowedAltiudeVariance = this.altiudeVarianceHistory.variance();
    this.setVariance(this.windowedAltiudeVariance);
    this.processMeasurement(deltaT, altitude, loudness, duration);
    this.vspeedHistory.add(this.getVelocity());
    this.vaccelHistory.add(this.getAcceleration());
  }
  
  setAltitudeVarianceHistoryWindow(samples: number) {
    this.altiudeVarianceWindowSize = samples;
    this.altiudeVarianceHistory = new WindowVariance(this.altiudeVarianceWindowSize);
  }

  setVspeedStdDevHistoryWindow(samples: number) {
    this.vspeedHistoryWindowSize = samples;
    this.vspeedHistory = new WindowVariance(this.vspeedHistoryWindowSize);

  }
  setVaccelStdDevHistoryWindow(samples: number) {
    this.vaccelHistoryWindowSize = samples;
    this.vaccelHistory = new WindowVariance(this.vaccelHistoryWindowSize);
  }

  currentVariance(): number {
    return this.windowedAltiudeVariance;
  }

  vspeedstandardDeviation(): number {
    return this.vspeedHistory.standardDeviation();
  }

  vaccelstandardDeviation(): number {
    return this.vaccelHistory.standardDeviation();
  }

  // prime the KF to quickly converge once real samples come
  setAltitude(altitude: number): void {
    for (let i = 0; i < this.altiudeVarianceWindowSize; i++) {
      this.altitudeSample(i, altitude);
    }
  }
}

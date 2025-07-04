import type { PluginListenerHandle } from '@capacitor/core';
import { Capacitor } from "@capacitor/core";

interface Position {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

interface PositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface WatchPositionCallback {
  (position: Position): void;
}

interface WatchPositionErrorCallback {
  (error: GeolocationPositionError): void;
}

export class MockGeolocation {
  private watchCallbacks: Map<string, WatchPositionCallback> = new Map();
  private watchErrorCallbacks: Map<string, WatchPositionErrorCallback> = new Map();
  private watchIntervals: Map<string, NodeJS.Timeout> = new Map();
  private watchIdCounter = 0;
  
  // Simulation parameters
  private centerLat = 47.0707; // Vienna, Austria latitude
  private centerLng = 15.4395; // Vienna, Austria longitude
  private baseAltitude = 500; // Base altitude in meters
  private radius = 0.01; // Radius in degrees (approximately 1 km)
  private speed = 5; // m/s ground speed
  private startTime = Date.now();
  
  // Angular velocity: complete circle in ~20 minutes
  private angularVelocity = (2 * Math.PI) / (20 * 60); // radians per second

  private generatePosition(): Position {
    const elapsed = (Date.now() - this.startTime) / 1000; // seconds
    const angle = elapsed * this.angularVelocity;
    
    // Circular movement
    const lat = this.centerLat + this.radius * Math.cos(angle);
    const lng = this.centerLng + this.radius * Math.sin(angle);
    
    // Varying altitude with some noise
    const altitudeVariation = 50 * Math.sin(elapsed * 0.1) + 20 * Math.sin(elapsed * 0.3);
    const altitude = this.baseAltitude + altitudeVariation;
    
    // Calculate heading (direction of movement)
    const heading = ((angle * 180 / Math.PI) + 90) % 360;
    
    return {
      coords: {
        latitude: lat,
        longitude: lng,
        altitude: altitude,
        accuracy: 3 + Math.random() * 2, // 3-5 meters accuracy
        altitudeAccuracy: 5 + Math.random() * 3, // 5-8 meters altitude accuracy
        heading: heading,
        speed: this.speed + (Math.random() - 0.5) * 2, // slight speed variation
      },
      timestamp: Date.now(),
    };
  }

  async getCurrentPosition(): Promise<Position> {
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    return this.generatePosition();
  }

  watchPosition(
    callback: WatchPositionCallback,
    errorCallback?: WatchPositionErrorCallback
  ): string {
    const watchId = `watch_${++this.watchIdCounter}`;
    
    this.watchCallbacks.set(watchId, callback);
    if (errorCallback) {
      this.watchErrorCallbacks.set(watchId, errorCallback);
    }
    
    // Start sending position updates
    const interval = setInterval(() => {
      try {
        const position = this.generatePosition();
        callback(position);
      } catch (error) {
        if (errorCallback) {
          errorCallback(error as GeolocationPositionError);
        }
      }
    }, 1000); // Update every second
    
    this.watchIntervals.set(watchId, interval);
    
    // Send initial position immediately
    setTimeout(() => {
      try {
        const position = this.generatePosition();
        callback(position);
      } catch (error) {
        if (errorCallback) {
          errorCallback(error as GeolocationPositionError);
        }
      }
    }, 0);
    console.log("MockGeolocation: Started generating simulated location data");

    return watchId;
  }

  
  clearWatch(watchId: string): void {
    const interval = this.watchIntervals.get(watchId);
    if (interval) {
      clearInterval(interval);
      this.watchIntervals.delete(watchId);
    }
    
    this.watchCallbacks.delete(watchId);
    this.watchErrorCallbacks.delete(watchId);
  }

  // Capacitor-style listener interface
  addListener(
    eventName: 'positionChanged',
    listenerFunc: (position: Position) => void
  ): Promise<PluginListenerHandle> {
    const watchId = this.watchPosition(listenerFunc);
    
    return Promise.resolve({
      remove: async () => {
        this.clearWatch(watchId);
      },
    });
  }

  // Additional methods for customization
  setCenter(latitude: number, longitude: number): void {
    this.centerLat = latitude;
    this.centerLng = longitude;
  }

  setRadius(radiusInDegrees: number): void {
    this.radius = radiusInDegrees;
  }

  setBaseAltitude(altitude: number): void {
    this.baseAltitude = altitude;
  }

  setSpeed(speedMs: number): void {
    this.speed = speedMs;
  }

  // Reset simulation time
  resetTime(): void {
    this.startTime = Date.now();
  }

  // Simulate GPS signal loss
  simulateError(watchId?: string): void {
    const error: GeolocationPositionError = {
      code: 2, // POSITION_UNAVAILABLE
      message: 'Simulated GPS signal loss',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    if (watchId) {
      const errorCallback = this.watchErrorCallbacks.get(watchId);
      if (errorCallback) {
        errorCallback(error);
      }
    } else {
      // Send error to all active watches
      this.watchErrorCallbacks.forEach(callback => callback(error));
    }
  }
}

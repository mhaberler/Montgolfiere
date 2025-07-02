import type { PluginListenerHandle } from '@capacitor/core';
import { WebPlugin } from '@capacitor/core';

// Define the interface locally to avoid import issues
interface BarometerInterface {
    isAvailable(): Promise<{ available: boolean }>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getPressure(): Promise<{ pressure: number; timestamp: number }>;
    echo(options: { value: string }): Promise<{ value: string }>;
    addListener(
        eventName: 'onPressureChange',
        listenerFunc: (data: { pressure: number; timestamp: number }) => void
    ): PluginListenerHandle;
    removeAllListeners(): Promise<void>;
}

/**
 * MockBarometer provides simulated barometric pressure data for testing and development.
 * It generates realistic pressure variations based on configurable parameters.
 */
export class MockBarometer extends WebPlugin implements BarometerInterface {
  private intervalId: any;
  private startPressure = 850;
  private currentPressure;
  private startTimestamp: number = Date.now();
  private isRunning = false;
  private pressureListeners: Array<
    (data: { pressure: number; timestamp: number }) => void
  > = [];

  // Configuration for pressure simulation
  private readonly baselineVariation = 5; // hPa variation range
  private readonly noiseAmplitude = 0.02; // hPa noise
  private readonly updateInterval = 250; // ms
  private readonly slowVariationFreq = 0.01; // Hz for slow pressure changes

  constructor() {
    super();
    this.currentPressure = this.startPressure;
  }

  /**
   * Checks if the barometer sensor is available on the device.
   * Always returns true for mock implementation.
   */
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: true };
  }

  /**
   * Starts listening for barometer updates.
   * Begins generating simulated pressure data at regular intervals.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTimestamp = Date.now();

    this.intervalId = setInterval(() => {
      this.updatePressure();
      this.notifyPressureListeners();
    }, this.updateInterval);

    console.log("MockBarometer: Started generating simulated pressure data");
  }

  /**
   * Stops listening for barometer updates.
   * Stops generating simulated pressure data.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("MockBarometer: Stopped generating simulated pressure data");
  }

  /**
   * Gets the last known pressure reading.
   */
  async getPressure(): Promise<{ pressure: number; timestamp: number }> {
    return {
      pressure: this.currentPressure,
      timestamp: Date.now()/1000,
    };
  }

  /**
   * An echo method for testing.
   */
  async echo(options: { value: string }): Promise<{ value: string }> {
    return { value: options.value };
  }

  /**
   * Adds a listener for pressure change events.
   */
  addListener(
    eventName: "onPressureChange",
    listenerFunc: (data: { pressure: number; timestamp: number }) => void
  ): PluginListenerHandle;
  addListener(
    eventName: string,
    listenerFunc: any
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: string | "onPressureChange",
    listenerFunc: any
  ): PluginListenerHandle | Promise<PluginListenerHandle> {
    if (eventName === "onPressureChange") {
      this.pressureListeners.push(listenerFunc);

      const handle: PluginListenerHandle = {
        remove: async () => {
          const index = this.pressureListeners.indexOf(listenerFunc);
          if (index > -1) {
            this.pressureListeners.splice(index, 1);
          }
        },
      };

      return handle;
    }

    // For other events, delegate to parent
    return super.addListener(eventName, listenerFunc);
  }

  /**
   * Removes all listeners for this plugin.
   */
  async removeAllListeners(): Promise<void> {
    this.pressureListeners = [];
  }

  /**
   * Updates the simulated pressure value with realistic variations.
   */
  private updatePressure(): void {
    const elapsed = (Date.now() - this.startTimestamp) / 1000; // seconds

    // Slow atmospheric pressure changes (weather patterns)
    const slowVariation =
      Math.sin(elapsed * this.slowVariationFreq * 2 * Math.PI) *
      this.baselineVariation;

    // Random noise
    const noise = (Math.random() - 0.5) * this.noiseAmplitude;

    // Calculate new pressure
    // const basePressure = this.startPressure + slowVariation;
    this.currentPressure = this.startPressure + slowVariation + noise;

    // Ensure pressure stays within realistic bounds (800-1100 hPa)
    this.currentPressure = Math.max(700, Math.min(1100, this.currentPressure));
  }

  /**
   * Notifies all registered listeners of pressure changes.
   */
  private notifyPressureListeners(): void {
    const data = {
      pressure: this.currentPressure,
      timestamp: Date.now()/1000,
    };

    this.pressureListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error("MockBarometer: Error in listener callback:", error);
      }
    });
  }

  /**
   * Sets a custom pressure value for testing purposes.
   */
  public setMockPressure(pressure: number): void {
    this.currentPressure = pressure;
    if (this.isRunning) {
      this.notifyPressureListeners();
    }
  }

  // /**
  //  * Simulates a rapid pressure change (e.g., elevator, weather front).
  //  */
  // public simulatePressureChange(
  //   targetPressure: number,
  //   durationMs: number = 5000
  // ): void {
  //   const startPressure = this.currentPressure;
  //   const startTime = Date.now();

  //   const changeInterval = setInterval(() => {
  //     const elapsed = Date.now() - startTime;
  //     const progress = Math.min(elapsed / durationMs, 1);

  //     // Use easing function for smooth transition
  //     const easeProgress = 1 - Math.cos((progress * Math.PI) / 2);
  //     this.currentPressure =
  //       startPressure + (targetPressure - startPressure) * easeProgress;

  //     if (progress >= 1) {
  //       clearInterval(changeInterval);
  //       console.log(
  //         `MockBarometer: Pressure change complete - ${targetPressure} hPa`
  //       );
  //     }
  //   }, 50);
  // }
}

// Example usage:
/*
const mockBarometer = new MockBarometer();

// Start generating pressure data
await mockBarometer.start();

// Listen for pressure changes
const handle = mockBarometer.addListener('onPressureChange', (data) => {
    console.log(`Pressure: ${data.pressure} hPa at ${new Date(data.timestamp)}`);
});

// Get current pressure
const current = await mockBarometer.getPressure();
console.log(`Current pressure: ${current.pressure} hPa`);

// Simulate a pressure change (e.g., elevator going up)
mockBarometer.simulatePressureChange(1000, 3000); // 1000 hPa over 3 seconds

// Set a specific pressure for testing
mockBarometer.setMockPressure(950);

// Stop and clean up
await mockBarometer.stop();
await mockBarometer.removeAllListeners();
*/

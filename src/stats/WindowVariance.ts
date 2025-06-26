import { RunningVariance } from './RunningVariance';
import { CircularBuffer } from './CircularBuffer';

export class WindowVariance extends RunningVariance {
    private cb: CircularBuffer;

    constructor(windowSize: number) {
        super();
        this.cb = new CircularBuffer(windowSize);
    }

    /**
     * Add a new value to the window
     * @param x The value to add
     */
    add(x: number): void {
        this.cb.push(x);
    }

    /**
     * Calculate the variance of the current window
     * @return The variance
     */
    override variance(): number {
        this.clear();
        for (const value of this.cb) {
            this.push(value);
        }
        return super.variance();
    }

    /**
     * Calculate the mean of the current window
     * @return The mean
     */
    override mean(): number {
        this.variance(); // This will compute both variance and mean
        return super.mean();
    }

    /**
     * Get the window size
     * @return The size of the window
     */
    getWindowSize(): number {
        return this.cb.capacity();
    }

    /**
     * Get the current number of values in the window
     * @return The current size
     */
    getCurrentSize(): number {
        return this.cb.size();
    }

    /**
     * Check if the window is full
     * @return True if the window is full
     */
    isFull(): boolean {
        return this.cb.isFull();
    }

    /**
     * Clear the window and reset statistics
     */
    clearWindow(): void {
        this.cb.clear();
        this.clear();
    }

    /**
     * Get the standard deviation of the current window
     * @return The standard deviation
     */
    override standardDeviation(): number {
        return Math.sqrt(this.variance());
    }

    /**
     * Get all values currently in the window
     * @return Array of values in the window
     */
    getValues(): number[] {
        return this.cb.toArray();
    }
}

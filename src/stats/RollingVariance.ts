export class RollingVariance {
    private samples: number[];
    private mean: number;
    private varSum: number;
    private windowSize: number;
    private i: number;

    /**
     * Constructor for RollingVariance
     * @param windowSize The size of the window for variance calculation
     */
    constructor(windowSize: number) {
        this.windowSize = windowSize;
        this.i = 0;
        this.mean = 0.0;
        this.varSum = 0.0;
        this.samples = new Array(this.windowSize).fill(0.0);
    }

    /**
     * Reset the instance to its initial state
     */
    clear(): void {
        this.i = 0;
        this.mean = 0.0;
        this.varSum = 0.0;
        this.samples.fill(0.0);
    }

    /**
     * Fill the window with a specified value and update statistics
     * @param value The value to fill the window with
     */
    prime(value: number): void {
        this.samples.fill(value);
        this.i = 0; // Reset index to start (though it doesn't affect variance/mean here)
        this.mean = value; // Mean is the value itself since all elements are identical
        this.varSum = 0.0; // Variance of identical values is 0
    }

    /**
     * Add a new value to the window and compute new statistics
     * @param xNew The new value to add
     */
    push(xNew: number): void {
        this.i = (this.i + 1) % this.windowSize;
        const xOld = this.samples[this.i];
        const dx = xNew - xOld;  // oldest x
        const newMean = this.mean + dx / this.windowSize; // new mean

        this.varSum += ((xNew + xOld - this.mean - newMean) * dx);
        this.mean = newMean;
        this.samples[this.i] = xNew;
    }

    /**
     * Compute the variance of the current window
     * @return The variance
     */
    variance(): number {
        return this.varSum / this.windowSize;
    }

    /**
     * Get the current mean of the window
     * @return The mean value
     */
    getMean(): number {
        return this.mean;
    }

    /**
     * Get the window size
     * @return The size of the window
     */
    getWindowSize(): number {
        return this.windowSize;
    }

    /**
     * Get the standard deviation
     * @return The standard deviation
     */
    standardDeviation(): number {
        return Math.sqrt(this.variance());
    }

    /**
     * Get a copy of the current window samples
     * @return Array of current samples
     */
    getSamples(): number[] {
        return [...this.samples];
    }
}

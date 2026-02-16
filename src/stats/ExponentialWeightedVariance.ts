/**
 * Exponentially Weighted Moving Variance (EWMV)
 * Computes variance with exponentially decaying weights on historical data
 *
 * Based on: https://grok.com/share/bGVnYWN5_86b4d8af-96c7-40f3-9de2-cc1b0e9d975c
 *
 * The algorithm maintains both an exponentially weighted moving average (EWMA)
 * for the mean and an EWMA for the variance using the online update formula:
 *   diff = x - mean
 *   incr = alpha * diff
 *   mean = mean + incr
 *   variance = (1 - alpha) * (variance + diff * incr)
 *
 * where alpha is the weight on new data (0 < alpha <= 1).
 * Higher alpha = more responsive to recent changes
 * Lower alpha = smoother, more historical weight
 */
export class ExponentialWeightedVariance {
    private alpha: number;
    private meanValue: number = 0;
    private varianceValue: number = 0;
    private count: number = 0;

    /**
     * Constructor for ExponentialWeightedVariance
     * @param alpha Weight on new data (0 < alpha <= 1), defaults to 0.1
     */
    constructor(alpha: number = 0.1) {
        this.alpha = alpha;
    }

    /**
     * Get the current alpha (weight on new data)
     * @return The alpha value
     */
    getAlpha(): number {
        return this.alpha;
    }

    /**
     * Set the alpha (weight on new data)
     * @param alpha Weight on new data (0 < alpha <= 1)
     */
    setAlpha(alpha: number): void {
        this.alpha = alpha;
    }

    /**
     * Get the current exponentially weighted mean
     * @return The mean value
     */
    mean(): number {
        return this.meanValue;
    }

    /**
     * Get the current exponentially weighted variance
     * @return The variance value
     */
    variance(): number {
        return this.varianceValue;
    }

    /**
     * Get the standard deviation
     * @return The standard deviation (sqrt of variance)
     */
    standardDeviation(): number {
        return Math.sqrt(this.varianceValue);
    }

    /**
     * Get the number of data points processed
     * @return Number of data points
     */
    numDataValues(): number {
        return this.count;
    }

    /**
     * Add a new data point and update the statistics
     * @param x The new value to add
     */
    push(x: number): void {
        const diff = x - this.meanValue;
        const incr = this.alpha * diff;
        this.meanValue += incr;
        this.varianceValue = (1.0 - this.alpha) * (this.varianceValue + diff * incr);
        this.count++;
    }

    /**
     * Reset all statistics to initial state
     */
    clear(): void {
        this.meanValue = 0;
        this.varianceValue = 0;
        this.count = 0;
    }

    /**
     * Check if any data has been processed
     * @return True if at least one data point has been added
     */
    isInitialized(): boolean {
        return this.count > 0;
    }

    /**
     * Clone this ExponentialWeightedVariance instance
     * @return A new instance with the same state
     */
    clone(): ExponentialWeightedVariance {
        const copy = new ExponentialWeightedVariance(this.alpha);
        copy.meanValue = this.meanValue;
        copy.varianceValue = this.varianceValue;
        copy.count = this.count;
        return copy;
    }
}

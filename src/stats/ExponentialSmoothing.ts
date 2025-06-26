export class ExponentialSmoothing {
    private alpha: number;
    private value: number = NaN;

    /**
     * Constructor for ExponentialSmoothing
     * @param alpha Smoothing factor (0-1), defaults to 1.0
     */
    constructor(alpha: number = 1.0) {
        this.alpha = alpha;
    }

    /**
     * Get the current smoothing factor
     * @return The alpha value
     */
    getAlpha(): number {
        return this.alpha;
    }

    /**
     * Set the smoothing factor
     * @param alpha Smoothing factor (0-1)
     */
    setAlpha(alpha: number): void {
        this.alpha = alpha;
    }

    /**
     * Get the current smoothed value
     * @return The current smoothed value
     */
    getValue(): number {
        return this.value;
    }

    /**
     * Add a new value to the exponential smoothing
     * @param x The new value to add
     */
    push(x: number): void {
        if (isNaN(this.value)) {
            this.value = x;
        } else {
            this.value = (x * this.alpha) + this.value * (1 - this.alpha);
        }
    }

    /**
     * Add a new value and return the smoothed result
     * @param x The new value to add
     * @return The smoothed value
     */
    smooth(x: number): number {
        this.push(x);
        return this.value;
    }

    /**
     * Reset the smoothing filter
     */
    clear(): void {
        this.value = NaN;
    }

    /**
     * Check if the filter has been initialized
     * @return True if initialized (has received at least one value)
     */
    isInitialized(): boolean {
        return !isNaN(this.value);
    }

    /**
     * Clone this ExponentialSmoothing instance
     * @return A new instance with the same state
     */
    clone(): ExponentialSmoothing {
        const copy = new ExponentialSmoothing(this.alpha);
        copy.value = this.value;
        return copy;
    }
}

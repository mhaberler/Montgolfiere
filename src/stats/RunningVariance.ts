export class RunningVariance {
    private n: number = 0; // Number of values
    private M1: number = 0; // First moment (mean)
    private M2: number = 0; // Second moment (for variance)

    constructor() {
        this.clear();
    }

    /**
     * Reset all statistics to initial state
     */
    clear(): void {
        this.n = 0;
        this.M1 = 0.0;
        this.M2 = 0.0;
    }

    /**
     * Add a new value to the statistics
     * @param x The value to add
     */
    push(x: number): void {
        const n1 = this.n;
        this.n++;
        const delta = x - this.M1;
        const delta_n = delta / this.n;
        const term1 = delta * delta_n * n1;
        this.M1 += delta_n;
        this.M2 += term1;
    }

    /**
     * Get the number of values added
     * @return Number of data points
     */
    numDataValues(): number {
        return this.n;
    }

    /**
     * Get the mean of the values
     * @return The mean
     */
    mean(): number {
        return this.M1;
    }

    /**
     * Get the sample variance (n-1 denominator)
     * @return The sample variance
     */
    variance(): number {
        return (this.n > 1) ? this.M2 / (this.n - 1) : 0.0;
    }

    /**
     * Get the standard deviation
     * @return The standard deviation
     */
    standardDeviation(): number {
        return Math.sqrt(this.variance());
    }

    /**
     * Get the population variance (n denominator)
     * @return The population variance
     */
    populationVariance(): number {
        return (this.n > 0) ? this.M2 / this.n : 0.0;
    }
}

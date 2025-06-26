import { RunningStats } from './RunningStats';

export class RunningRegression {
    private xStats: RunningStats = new RunningStats();
    private yStats: RunningStats = new RunningStats();
    private Sxy: number = 0.0;
    private n: number = 0;

    constructor() {
        this.clear();
    }

    /**
     * Reset all statistics to initial state
     */
    clear(): void {
        this.xStats = new RunningStats();
        this.yStats = new RunningStats();
        this.Sxy = 0.0;
        this.n = 0;
    }

    /**
     * Add a new (x, y) data point to the regression
     * @param x The x value
     * @param y The y value
     */
    push(x: number, y: number): void {
        // Update covariance using the running algorithm
        this.Sxy += (this.xStats.mean() - x) * (this.yStats.mean() - y) * this.n / (this.n + 1);

        // Update individual statistics
        this.xStats.push(x);
        this.yStats.push(y);
        this.n++;
    }

    /**
     * Get the number of data points
     * @return Number of (x, y) pairs
     */
    numDataValues(): number {
        return this.n;
    }

    /**
     * Calculate the slope of the regression line
     * @return The slope (rise/run)
     */
    slope(): number {
        if (this.n < 2) return NaN;

        const Sxx = this.xStats.variance() * (this.n - 1.0);

        if (Sxx === 0) return NaN; // Vertical line or no variance in x

        return this.Sxy / Sxx;
    }

    /**
     * Calculate the y-intercept of the regression line
     * @return The y-intercept
     */
    intercept(): number {
        if (this.n < 2) return NaN;

        return this.yStats.mean() - this.slope() * this.xStats.mean();
    }

    /**
     * Calculate the correlation coefficient (Pearson's r)
     * @return The correlation coefficient (-1 to 1)
     */
    correlation(): number {
        if (this.n < 2) return NaN;

        const denominator = this.xStats.standardDeviation() * this.yStats.standardDeviation();

        if (denominator === 0) return NaN; // No variance in x or y

        return this.Sxy / ((this.n - 1) * denominator);
    }

    /**
     * Calculate the coefficient of determination (R²)
     * @return R-squared value (0 to 1)
     */
    rSquared(): number {
        const r = this.correlation();
        return isNaN(r) ? NaN : r * r;
    }

    /**
     * Predict y value for a given x using the regression line
     * @param x The x value to predict for
     * @return The predicted y value
     */
    predict(x: number): number {
        if (this.n < 2) return NaN;

        return this.intercept() + this.slope() * x;
    }

    /**
     * Get the mean of x values
     * @return Mean of x values
     */
    meanX(): number {
        return this.xStats.mean();
    }

    /**
     * Get the mean of y values
     * @return Mean of y values
     */
    meanY(): number {
        return this.yStats.mean();
    }

    /**
     * Get the variance of x values
     * @return Variance of x values
     */
    varianceX(): number {
        return this.xStats.variance();
    }

    /**
     * Get the variance of y values
     * @return Variance of y values
     */
    varianceY(): number {
        return this.yStats.variance();
    }

    /**
     * Get the standard deviation of x values
     * @return Standard deviation of x values
     */
    standardDeviationX(): number {
        return this.xStats.standardDeviation();
    }

    /**
     * Get the standard deviation of y values
     * @return Standard deviation of y values
     */
    standardDeviationY(): number {
        return this.yStats.standardDeviation();
    }

    /**
     * Combine two RunningRegression instances
     * @param other The other RunningRegression instance to combine with
     * @return A new combined RunningRegression instance
     */
    combine(other: RunningRegression): RunningRegression {
        const combined = new RunningRegression();

        combined.xStats = this.xStats.combine(other.xStats);
        combined.yStats = this.yStats.combine(other.yStats);
        combined.n = this.n + other.n;

        if (combined.n === 0) return combined;

        const deltaX = other.xStats.mean() - this.xStats.mean();
        const deltaY = other.yStats.mean() - this.yStats.mean();

        combined.Sxy = this.Sxy + other.Sxy +
                       (this.n * other.n) * deltaX * deltaY / combined.n;

        return combined;
    }

    /**
     * Add another RunningRegression instance to this one
     * @param other The other RunningRegression instance to add
     * @return This instance for chaining
     */
    add(other: RunningRegression): RunningRegression {
        const combined = this.combine(other);
        this.xStats = combined.xStats;
        this.yStats = combined.yStats;
        this.Sxy = combined.Sxy;
        this.n = combined.n;
        return this;
    }

    /**
     * Create a copy of this RunningRegression instance
     * @return A new RunningRegression instance with the same values
     */
    clone(): RunningRegression {
        const copy = new RunningRegression();
        copy.xStats = this.xStats.clone();
        copy.yStats = this.yStats.clone();
        copy.Sxy = this.Sxy;
        copy.n = this.n;
        return copy;
    }

    /**
     * Get the regression equation as a string
     * @return String representation of the regression line
     */
    equation(): string {
        if (this.n < 2) return "Insufficient data";

        const slope = this.slope();
        const intercept = this.intercept();

        if (isNaN(slope) || isNaN(intercept)) return "Invalid regression";

        const interceptStr = intercept >= 0 ? `+ ${intercept.toFixed(4)}` : `- ${Math.abs(intercept).toFixed(4)}`;
        return `y = ${slope.toFixed(4)}x ${interceptStr}`;
    }
}

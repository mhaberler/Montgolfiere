import { RunningStats } from './RunningStats';

export class TimerStats extends RunningStats {
    private startTime: number = NaN;
    private lapTime: number = NaN;

    /**
     * Get current time in microseconds
     * In browser/Node.js environments, this uses performance.now() for high precision
     */
    private getCurrentTimeMicros(): number {
        // performance.now() returns milliseconds with sub-millisecond precision
        // Convert to microseconds for compatibility with C++ version
        if (typeof performance !== 'undefined') {
            return performance.now() * 1000;
        } else {
            // Fallback for Node.js environments without performance API
            const hrTime = process.hrtime();
            return hrTime[0] * 1000000 + hrTime[1] / 1000;
        }
    }

    /**
     * Start timing an interval
     * Call this before the operation you want to time
     */
    start(): void {
        this.startTime = this.getCurrentTimeMicros();
    }

    /**
     * Stop timing and record the duration
     * Call this after the operation you want to time
     */
    stop(): void {
        if (isNaN(this.startTime)) {
            throw new Error('stop() called without start()');
        }
        const duration = this.getCurrentTimeMicros() - this.startTime;
        this.push(duration);
    }

    /**
     * Record a lap time (time since last lap or first call)
     * Useful for measuring intervals between repeated events
     */
    lap(): void {
        const now = this.getCurrentTimeMicros();
        if (isNaN(this.lapTime)) { // First time
            this.lapTime = now;
        } else {
            const duration = now - this.lapTime;
            this.push(duration);
            this.lapTime = now;
        }
    }

    /**
     * Get the start time of the current interval
     * @return Start time in microseconds
     */
    getStartTime(): number {
        return this.startTime;
    }

    /**
     * Get the time of the last lap
     * @return Lap time in microseconds
     */
    getLapTime(): number {
        return this.lapTime;
    }

    /**
     * Clear all timing statistics and reset timers
     */
    override clear(): void {
        this.startTime = NaN;
        this.lapTime = NaN;
        super.clear();
    }

    /**
     * Get the mean duration in milliseconds
     * @return Mean duration in milliseconds
     */
    meanMilliseconds(): number {
        return this.mean() / 1000;
    }

    /**
     * Get the mean duration in seconds
     * @return Mean duration in seconds
     */
    meanSeconds(): number {
        return this.mean() / 1000000;
    }

    /**
     * Get the standard deviation in milliseconds
     * @return Standard deviation in milliseconds
     */
    standardDeviationMilliseconds(): number {
        return this.standardDeviation() / 1000;
    }

    /**
     * Get the standard deviation in seconds
     * @return Standard deviation in seconds
     */
    standardDeviationSeconds(): number {
        return this.standardDeviation() / 1000000;
    }

    /**
     * Get a summary of timing statistics
     * @return Object with timing statistics in various units
     */
    getSummary(): {
        count: number;
        meanMicros: number;
        meanMillis: number;
        meanSeconds: number;
        stdDevMicros: number;
        stdDevMillis: number;
        stdDevSeconds: number;
    } {
        return {
            count: this.numDataValues(),
            meanMicros: this.mean(),
            meanMillis: this.meanMilliseconds(),
            meanSeconds: this.meanSeconds(),
            stdDevMicros: this.standardDeviation(),
            stdDevMillis: this.standardDeviationMilliseconds(),
            stdDevSeconds: this.standardDeviationSeconds()
        };
    }
}

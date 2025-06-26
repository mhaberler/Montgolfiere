import { RunningStats } from './RunningStats';

/**
 * RateStats measures instantaneous rates between consecutive events
 * and maintains running statistics of these rates.
 *
 * Usage:
 * - Call push() whenever your event occurs
 * - First push establishes baseline time
 * - Second and subsequent pushes calculate rates
 * - The mean value represents average events per second
 */
export class RateStats extends RunningStats {
    private lastPushTime: number = NaN;

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
     * Record an event and calculate rate since last push
     * First call establishes baseline time, subsequent calls calculate rates
     */
    override push(): void;
    override push(value?: number): void {
        if (value !== undefined) {
            // If a value is provided, use parent's push method
            super.push(value);
            return;
        }

        const now = this.getCurrentTimeMicros();
        if (!isNaN(this.lastPushTime)) {
            // Convert microseconds to seconds and calculate rate (events/second)
            const deltaSeconds = (now - this.lastPushTime) / 1000000.0;
            if (deltaSeconds > 0) {
                // Rate = 1/time between events (events per second)
                super.push(1.0 / deltaSeconds);
            }
        }
        this.lastPushTime = now;
    }

    /**
     * Reset the stats and timing
     */
    override clear(): void {
        this.lastPushTime = NaN;
        super.clear();
    }

    /**
     * Get time since last push in seconds
     * @return Time since last event in seconds, or NaN if no events recorded
     */
    timeSinceLastPush(): number {
        if (isNaN(this.lastPushTime)) return NaN;
        return (this.getCurrentTimeMicros() - this.lastPushTime) / 1000000.0;
    }

    /**
     * Get time since last push in milliseconds
     * @return Time since last event in milliseconds
     */
    timeSinceLastPushMilliseconds(): number {
        if (isNaN(this.lastPushTime)) return NaN;
        return (this.getCurrentTimeMicros() - this.lastPushTime) / 1000.0;
    }

    /**
     * Get the average rate (events per second)
     * @return Average events per second
     */
    averageRate(): number {
        return this.mean();
    }

    /**
     * Get the maximum rate seen (events per second)
     * @return Maximum events per second (requires implementation of max in RunningStats)
     */
    peakRate(): number {
        // Note: This would require adding min/max tracking to RunningStats
        // For now, return NaN as placeholder
        return NaN;
    }

    /**
     * Get rate statistics summary
     * @return Object with rate statistics
     */
    getRateSummary(): {
        count: number;
        averageRate: number;
        rateStdDev: number;
        timeSinceLastSeconds: number;
        timeSinceLastMillis: number;
    } {
        return {
            count: this.numDataValues(),
            averageRate: this.averageRate(),
            rateStdDev: this.standardDeviation(),
            timeSinceLastSeconds: this.timeSinceLastPush(),
            timeSinceLastMillis: this.timeSinceLastPushMilliseconds()
        };
    }

    /**
     * Check if any events have been recorded
     * @return True if at least one event has been recorded
     */
    hasEvents(): boolean {
        return !isNaN(this.lastPushTime);
    }

    /**
     * Get the timestamp of the last event
     * @return Timestamp in microseconds, or NaN if no events
     */
    getLastEventTime(): number {
        return this.lastPushTime;
    }
}

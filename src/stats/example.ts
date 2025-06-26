import {
    CircularBuffer,
    RunningVariance,
    RollingVariance,
    WindowVariance,
    RunningStats,
    RunningRegression,
    ConfidenceInterval,
    ExponentialSmoothing,
    TimerStats,
    RateStats,
    QuadraticFitOnline
} from './index';
import { testQuadraticFitOnline } from './QuadraticFitOnline.test';

// Example usage and tests
console.log('=== CircularBuffer Test ===');
const cb = new CircularBuffer(3);
cb.push(1);
cb.push(2);
cb.push(3);
console.log('Buffer contents:', cb.toArray()); // [1, 2, 3]
cb.push(4); // Should overwrite the first element
console.log('After adding 4:', cb.toArray()); // [4, 2, 3] or similar based on implementation

console.log('\n=== RunningVariance Test ===');
const rv = new RunningVariance();
[1, 2, 3, 4, 5].forEach(x => rv.push(x));
console.log('Mean:', rv.mean());
console.log('Variance:', rv.variance());
console.log('Standard Deviation:', rv.standardDeviation());

console.log('\n=== RollingVariance Test ===');
const rollVar = new RollingVariance(3);
[1, 2, 3, 4, 5].forEach(x => rollVar.push(x));
console.log('Rolling Mean:', rollVar.getMean());
console.log('Rolling Variance:', rollVar.variance());
console.log('Rolling Std Dev:', rollVar.standardDeviation());

console.log('\n=== WindowVariance Test ===');
const wv = new WindowVariance(3);
[1, 2, 3, 4, 5].forEach(x => wv.add(x));
console.log('Window Mean:', wv.mean());
console.log('Window Variance:', wv.variance());
console.log('Window Values:', wv.getValues());
console.log('Window Size:', wv.getWindowSize());
console.log('Current Size:', wv.getCurrentSize());
console.log('Is Full:', wv.isFull());

console.log('\n=== RunningStats Test ===');
const rs = new RunningStats();
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(x => rs.push(x));
console.log('Mean:', rs.mean());
console.log('Variance:', rs.variance());
console.log('Standard Deviation:', rs.standardDeviation());
console.log('Skewness:', rs.skewness());
console.log('Kurtosis:', rs.kurtosis());
console.log('95% Confidence Interval:', rs.confidenceInterval(ConfidenceInterval.CI95));

console.log('\n=== RunningRegression Test ===');
const rr = new RunningRegression();
// Add some linear data points: y = 2x + 1 with some noise
const dataPoints = [
    [1, 3.1], [2, 5.2], [3, 6.8], [4, 9.1], [5, 10.9],
    [6, 13.2], [7, 14.8], [8, 17.1], [9, 19.0], [10, 20.8]
];
dataPoints.forEach(([x, y]) => rr.push(x, y));

console.log('Slope:', rr.slope());
console.log('Intercept:', rr.intercept());
console.log('Correlation:', rr.correlation());
console.log('R-squared:', rr.rSquared());
console.log('Equation:', rr.equation());
console.log('Predict x=11:', rr.predict(11));
console.log('Data points:', rr.numDataValues());

console.log('\n=== ExponentialSmoothing Test ===');
const es = new ExponentialSmoothing(0.3); // Alpha = 0.3
const noisyData = [10, 12, 8, 15, 9, 11, 13, 7, 14, 10];
console.log('Raw data:', noisyData);
console.log('Smoothed values:');
noisyData.forEach((value, i) => {
    const smoothed = es.smooth(value);
    console.log(`  Step ${i + 1}: ${value} -> ${smoothed.toFixed(2)}`);
});
console.log('Final smoothed value:', es.getValue());

console.log('\n=== TimerStats Test ===');
const ts = new TimerStats();

// Simulate some timed operations
for (let i = 0; i < 5; i++) {
    ts.start();
    // Simulate work with a small delay
    const start = performance.now();
    while (performance.now() - start < 1 + Math.random() * 2) {
        // Busy wait for 1-3ms
    }
    ts.stop();
}

const timerSummary = ts.getSummary();
console.log('Timer Summary:');
console.log('  Count:', timerSummary.count);
console.log('  Mean (ms):', timerSummary.meanMillis.toFixed(3));
console.log('  Std Dev (ms):', timerSummary.stdDevMillis.toFixed(3));

console.log('\n=== RateStats Test ===');
const rates = new RateStats();

// Simulate events with varying intervals
console.log('Simulating events...');
for (let i = 0; i < 5; i++) {
    rates.push(); // Record an event

    // Wait with a random interval (simulated)
    const start = performance.now();
    const waitTime = 50 + Math.random() * 100; // 50-150ms
    while (performance.now() - start < waitTime) {
        // Busy wait
    }
}

const rateSummary = rates.getRateSummary();
console.log('Rate Summary:');
console.log('  Events recorded:', rateSummary.count);
console.log('  Average rate (events/sec):', rateSummary.averageRate.toFixed(2));
console.log('  Rate std dev:', rateSummary.rateStdDev.toFixed(2));
console.log('  Time since last event (ms):', rateSummary.timeSinceLastMillis.toFixed(1));

// Test QuadraticFitOnline
testQuadraticFitOnline();

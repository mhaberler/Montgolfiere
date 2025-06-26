# Running Statistics - TypeScript Implementation

This directory contains TypeScript implementations of the C++ statistical classes in the directory above.
```
import {
    CircularBuffer,
    RunningVariance,
    RollingVariance,
    WindowVariance,
    RunningStats,
    RunningRegression,
    ExponentialSmoothing,
    TimerStats,
    RateStats,
    ConfidenceInterval
} from './index';
```
typescript parameters have been removed and the classes now work specifically with JavaScript numbers.

## Classes

### CircularBuffer
A circular buffer implementation that automatically overwrites old data when the buffer is full.

```typescript
const buffer = new CircularBuffer(5);
buffer.push(1);
buffer.push(2);
console.log(buffer.toArray()); // [1, 2]
```

### RunningVariance
Calculates running variance and mean using Welford's online algorithm.

```typescript
const rv = new RunningVariance();
rv.push(1);
rv.push(2);
rv.push(3);
console.log(rv.mean()); // Mean of all values
console.log(rv.variance()); // Sample variance
```

### RollingVariance
Calculates variance over a fixed-size sliding window using an efficient rolling algorithm.

```typescript
const rollVar = new RollingVariance(10); // Window size of 10
rollVar.push(1);
rollVar.push(2);
console.log(rollVar.variance()); // Variance of last 10 values
```

### WindowVariance
Combines CircularBuffer with RunningVariance to calculate variance over a sliding window.

```typescript
const wv = new WindowVariance(5); // Window size of 5
wv.add(1);
wv.add(2);
console.log(wv.variance()); // Variance of values in window
console.log(wv.getValues()); // Array of current window values
```

### RunningStats
Comprehensive running statistics including mean, variance, skewness, kurtosis, and confidence intervals.

```typescript
const rs = new RunningStats();
rs.push(1);
rs.push(2);
rs.push(3);
console.log(rs.mean()); // Mean
console.log(rs.variance()); // Sample variance
console.log(rs.skewness()); // Skewness
console.log(rs.kurtosis()); // Kurtosis
console.log(rs.confidenceInterval(ConfidenceInterval.CI95)); // 95% CI
```

### RunningRegression
Online linear regression calculation with slope, intercept, correlation, and prediction capabilities.

```typescript
const rr = new RunningRegression();
rr.push(1, 2.1); // (x, y) pairs
rr.push(2, 4.2);
rr.push(3, 5.8);
console.log(rr.slope()); // Regression slope
console.log(rr.intercept()); // Y-intercept
console.log(rr.correlation()); // Pearson correlation coefficient
console.log(rr.rSquared()); // R-squared value
console.log(rr.equation()); // "y = mx + b" string
console.log(rr.predict(4)); // Predict y for x=4
```

### ExponentialSmoothing
Exponential smoothing filter for noise reduction in time series data.

```typescript
const es = new ExponentialSmoothing(0.3); // Alpha = 0.3 (smoothing factor)
const smoothed = es.smooth(10.5); // Add value and get smoothed result
console.log(es.getValue()); // Current smoothed value
es.setAlpha(0.1); // Change smoothing factor
```

### TimerStats
Timer-based statistics for measuring operation durations with high precision.

```typescript
const ts = new TimerStats();

// Interval timing
ts.start();
// ... do some work ...
ts.stop(); // Records the duration

// Lap timing
ts.lap(); // First call establishes baseline
// ... do some work ...
ts.lap(); // Records time since last lap

console.log(ts.meanMilliseconds()); // Average duration in ms
console.log(ts.standardDeviationSeconds()); // Std dev in seconds
```

### RateStats
Measures instantaneous rates between consecutive events and maintains statistics.

```typescript
const rs = new RateStats();

// Record events
rs.push(); // First call establishes baseline
rs.push(); // Subsequent calls calculate rates

console.log(rs.averageRate()); // Average events per second
console.log(rs.timeSinceLastPush()); // Time since last event
console.log(rs.getRateSummary()); // Complete rate statistics
```

### QuadraticFitOnline
Online quadratic regression using recursive least squares algorithm. Fits y = ax² + bx + c to streaming data.

```typescript
const qf = new QuadraticFitOnline();
qf.update(0, 1); // Add (x, y) data points
qf.update(1, 4);
qf.update(2, 9);

const [c, b, a] = qf.getCoefficients(); // [constant, linear, quadratic]
console.log(qf.getEquation()); // "y = 1.000000x² + 0.000000x + 1.000000"
console.log(qf.predict(3)); // Predict y for x=3
console.log(qf.calculateRSquared(dataPoints)); // R-squared for fit quality
```

## Building

```bash
npm install
npm run build
```

## Usage

```typescript
import {
    CircularBuffer,
    RunningVariance,
    RollingVariance,
    WindowVariance,
    RunningStats,
    RunningRegression,
    ExponentialSmoothing,
    TimerStats,
    RateStats,
    QuadraticFitOnline,
    ConfidenceInterval
} from './index';
```

## Key Changes from C++

1. **No Templates**: All classes work with JavaScript `number` type
2. **Memory Management**: No manual memory management (garbage collected)
3. **Iterators**: CircularBuffer uses JavaScript's `Symbol.iterator` for `for...of` loops
4. **Method Names**: Converted to camelCase following JavaScript conventions
5. **Return Types**: Methods that returned by reference now return values directly
6. **Null Safety**: Methods that could fail (like `pop()`) return `null` instead of boolean success flags
7. **Operator Overloading**: Replaced with explicit methods (e.g., `combine()`, `add()`)
8. **Enums**: TypeScript enums used for confidence interval types
9. **Linear Algebra**: Uses mathjs library instead of Eigen for matrix operations

## Dependencies

- **mathjs**: Used by QuadraticFitOnline for matrix operations (replaces C++ Eigen library)
- All other classes are dependency-free and use only built-in JavaScript functionality

## Statistical Algorithms

### RunningStats
- Uses Welford's online algorithm for numerically stable computation
- Calculates up to 4th moment (kurtosis) incrementally
- Supports confidence intervals for normal distributions
- Can combine multiple instances for parallel computation

### RunningRegression
- Implements online linear regression using running covariance
- Calculates Pearson correlation coefficient
- Provides R-squared for goodness of fit
- Supports prediction and equation formatting
- Can combine multiple regression instances

### QuadraticFitOnline
- Uses recursive least squares (RLS) algorithm for online quadratic fitting
- Implements Kalman filter-like updates for coefficient estimation
- No need to store historical data points (truly online)
- Uses mathjs for matrix operations (3x3 matrices and 3x1 vectors)
- Provides R-squared calculation for fit quality assessment

### Variance Classes
- **RunningVariance**: Simple running variance (Welford's algorithm)
- **RollingVariance**: Fixed-window variance with O(1) updates
- **WindowVariance**: Flexible windowed variance with value access

## Performance Notes

- All classes maintain O(1) operations for their core functionality
- RollingVariance is more efficient than WindowVariance for pure variance calculation
- WindowVariance provides more flexibility with access to individual window values
- RunningStats and RunningRegression support parallel computation via combine operations

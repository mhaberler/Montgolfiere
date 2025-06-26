import { QuadraticFitOnline } from './QuadraticFitOnline';

/**
 * Test case extracted from the C++ comments
 * Tests the QuadraticFitOnline class with sample data points
 */
export function testQuadraticFitOnline(): void {
    console.log('=== QuadraticFitOnline Test ===');

    const fit = new QuadraticFitOnline();

    // Sample time series data points (from original C++ test case)
    const testData: Array<[number, number]> = [
        [0.0, 0.0],
        [1.0, 1.0],
        [2.0, 3.0],
        [3.0, 7.0]
    ];

    console.log('Feeding data points to the algorithm:');

    // Feed data points to the algorithm
    testData.forEach(([x, y]) => {
        fit.update(x, y);
        const [c, b, a] = fit.getCoefficients();
        console.log(`After point (${x}, ${y}): c = ${c.toFixed(6)}, b = ${b.toFixed(6)}, a = ${a.toFixed(6)}`);
    });

    // Test prediction
    const xTest = 4.0;
    const prediction = fit.predict(xTest);
    console.log(`Predicted y at x = ${xTest}: ${prediction.toFixed(6)}`);

    // Show the equation
    console.log('Quadratic equation:', fit.getEquation());

    // Calculate R-squared for the fit quality
    const rSquared = fit.calculateRSquared(testData);
    console.log(`R-squared: ${rSquared.toFixed(6)}`);

    // Test with perfect quadratic data y = x^2 + 2x + 1
    console.log('\n--- Testing with perfect quadratic data: y = x² + 2x + 1 ---');
    const perfectFit = new QuadraticFitOnline();
    const perfectData: Array<[number, number]> = [];

    for (let x = 0; x <= 5; x++) {
        const y = x * x + 2 * x + 1; // Perfect quadratic
        perfectData.push([x, y]);
        perfectFit.update(x, y);
    }

    const [pc, pb, pa] = perfectFit.getCoefficients();
    console.log(`Perfect fit coefficients: c = ${pc.toFixed(6)}, b = ${pb.toFixed(6)}, a = ${pa.toFixed(6)}`);
    console.log('Expected: c = 1.000000, b = 2.000000, a = 1.000000');
    console.log('Perfect fit equation:', perfectFit.getEquation());

    const perfectRSquared = perfectFit.calculateRSquared(perfectData);
    console.log(`Perfect fit R-squared: ${perfectRSquared.toFixed(6)}`);

    // Test prediction with perfect fit
    const testX = 10;
    const expectedY = testX * testX + 2 * testX + 1; // 121
    const predictedY = perfectFit.predict(testX);
    console.log(`Perfect fit prediction at x = ${testX}: expected = ${expectedY}, predicted = ${predictedY.toFixed(6)}`);
}

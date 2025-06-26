import { Matrix, matrix, multiply, add, subtract, transpose, dot, identity, zeros } from 'mathjs';

/**
 * Online quadratic fitting using recursive least squares
 * Fits a quadratic function y = ax² + bx + c to streaming data
 * Based on: https://grok.com/share/bGVnYWN5_7e91020c-652b-4ec1-ba92-9f6ceacd7440
 */
export class QuadraticFitOnline {
    private beta: Matrix; // Coefficients [c, b, a]
    private P: Matrix;    // Inverse covariance matrix (3x3)

    constructor() {
        // Initialize coefficients to zero
        this.beta = zeros([3, 1]) as Matrix;

        // Initialize P to a large diagonal matrix (1e6 * I)
        this.P = multiply(1e6, identity(3)) as Matrix;
    }

    /**
     * Update the fit with a new data point (x, y)
     * @param x The x coordinate
     * @param y The y coordinate
     */
    update(x: number, y: number): void {
        // Feature vector: [1, x, x²] as column vector
        const xVec = matrix([[1], [x], [x * x]]);

        // Compute P * x_vec
        const Px = multiply(this.P, xVec) as Matrix;

        // Compute the scalar denominator: 1 + x_vec^T * P * x_vec
        const xVecT = transpose(xVec) as Matrix;
        const scalar = 1.0 + (multiply(multiply(xVecT, this.P), xVec) as Matrix).get([0, 0]);

        // Compute the gain vector K = Px / scalar
        const K = multiply(Px, 1.0 / scalar) as Matrix;

        // Compute the prediction error: y - x_vec^T * beta
        const prediction = (multiply(xVecT, this.beta) as Matrix).get([0, 0]);
        const error = y - prediction;

        // Update the coefficients: beta = beta + K * error
        this.beta = add(this.beta, multiply(K, error)) as Matrix;

        // Update the covariance matrix P: P = P - (Px * Px^T) / scalar
        const PxPxT = multiply(Px, transpose(Px)) as Matrix;
        const update = multiply(PxPxT, 1.0 / scalar) as Matrix;
        this.P = subtract(this.P, update) as Matrix;
    }

    /**
     * Get the current coefficients [c, b, a]
     * @return Array containing [constant, linear, quadratic] coefficients
     */
    getCoefficients(): [number, number, number] {
        const c = this.beta.get([0, 0]); // constant term
        const b = this.beta.get([1, 0]); // linear term
        const a = this.beta.get([2, 0]); // quadratic term
        return [c, b, a];
    }

    /**
     * Predict y for a given x using the current quadratic fit
     * @param x The x value to predict for
     * @return The predicted y value
     */
    predict(x: number): number {
        // Feature vector: [1, x, x²] as column vector
        const xVec = matrix([[1], [x], [x * x]]);

        // Compute prediction: x_vec^T * beta
        const xVecT = transpose(xVec) as Matrix;
        return (multiply(xVecT, this.beta) as Matrix).get([0, 0]);
    }

    /**
     * Get the quadratic equation as a string
     * @return String representation of the quadratic equation
     */
    getEquation(): string {
        const [c, b, a] = this.getCoefficients();

        let equation = "y = ";

        // Quadratic term
        if (Math.abs(a) > 1e-10) {
            if (Math.abs(a - 1) < 1e-10) {
                equation += "x²";
            } else if (Math.abs(a + 1) < 1e-10) {
                equation += "-x²";
            } else {
                equation += `${a.toFixed(6)}x²`;
            }
        }

        // Linear term
        if (Math.abs(b) > 1e-10) {
            if (equation !== "y = ") {
                equation += b >= 0 ? " + " : " - ";
                const absB = Math.abs(b);
                if (Math.abs(absB - 1) < 1e-10) {
                    equation += "x";
                } else {
                    equation += `${absB.toFixed(6)}x`;
                }
            } else {
                if (Math.abs(b - 1) < 1e-10) {
                    equation += "x";
                } else if (Math.abs(b + 1) < 1e-10) {
                    equation += "-x";
                } else {
                    equation += `${b.toFixed(6)}x`;
                }
            }
        }

        // Constant term
        if (Math.abs(c) > 1e-10) {
            if (equation !== "y = ") {
                equation += c >= 0 ? " + " : " - ";
                equation += Math.abs(c).toFixed(6);
            } else {
                equation += c.toFixed(6);
            }
        }

        // Handle case where all coefficients are essentially zero
        if (equation === "y = ") {
            equation = "y = 0";
        }

        return equation;
    }

    /**
     * Calculate R-squared (coefficient of determination) if you have the original data
     * Note: This requires storing y values, which defeats the purpose of online fitting
     * This method is provided for completeness but requires external calculation
     */
    calculateRSquared(dataPoints: Array<[number, number]>): number {
        if (dataPoints.length === 0) return NaN;

        // Calculate mean of y values
        const yMean = dataPoints.reduce((sum, [, y]) => sum + y, 0) / dataPoints.length;

        // Calculate total sum of squares and residual sum of squares
        let totalSumSquares = 0;
        let residualSumSquares = 0;

        for (const [x, y] of dataPoints) {
            const predicted = this.predict(x);
            totalSumSquares += (y - yMean) ** 2;
            residualSumSquares += (y - predicted) ** 2;
        }

        return 1 - (residualSumSquares / totalSumSquares);
    }

    /**
     * Reset the quadratic fit to initial state
     */
    clear(): void {
        this.beta = zeros([3, 1]) as Matrix;
        this.P = multiply(1e6, identity(3)) as Matrix;
    }

    /**
     * Create a copy of this QuadraticFitOnline instance
     * @return A new instance with the same state
     */
    clone(): QuadraticFitOnline {
        const copy = new QuadraticFitOnline();
        copy.beta = this.beta.clone() as Matrix;
        copy.P = this.P.clone() as Matrix;
        return copy;
    }
}

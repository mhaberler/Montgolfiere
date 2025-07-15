<script setup>
import * as d3 from 'd3';
import { ref, onMounted, watch, onUnmounted } from 'vue';

// Define props for all configurable aspects of the scale
const props = defineProps({
    value: {
        type: Number,
        default: 0
    },
    indicatorSize: {
        type: Number,
        default: 20
    },
    indicatorColor: {
        type: String,
        default: '#ef4444'
    },
    indicatorOpacity: {
        type: Number,
        default: 1.0
    },
    indicatorDistancePercent: {
        type: Number,
        default: 5
    },
    confidenceRangePercent: {
        type: Number,
        default: 5
    },
    confidenceOpacity: {
        type: Number,
        default: 0.6
    },
    confidenceColor: {
        type: String,
        default: '#a7f3d0'
    },
    confidenceBoxCrossDimension: {
        type: Number,
        default: 20
    },
    transitionDuration: {
        type: Number,
        default: 0.3
    },
    orientation: {
        type: String,
        default: 'horizontal' // 'horizontal' or 'vertical'
    },
    scalePadding: {
        type: Number,
        default: 50
    },
    majorTicks: {
        type: Array,
        default: () => [-10, -5, -1, 0, 1, 5, 10],
        validator: (arr) => arr.length >= 2 && arr.every((val, i, a) => i === 0 || val >= a[i - 1]) // Must be sorted and have at least 2
    },
    minorTicks: {
        type: Array,
        default: () => [-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]
    },
    intermediateTicks: {
        type: Array,
        default: () => [-0.5, 0.5]
    },
    weights: {
        type: Array,
        default: () => [0.1, 0.1, 0.3, 0.3, 0.1, 0.1], // Must sum to 1 and match majorTicks segments
        validator: (arr, props) => {
            if (props.majorTicks.length === 0) return true; // No major ticks, weights don't apply yet
            const expectedLength = props.majorTicks.length - 1;
            const sum = arr.reduce((acc, val) => acc + val, 0);
            return arr.length === expectedLength && Math.abs(sum - 1.0) < 0.001; // Sum must be ~1
        }
    },
    majorTickTextOffset: { // New prop for configurable text offset
        type: Number,
        default: 15
    }
});

// Ref for the SVG element, allowing D3 to select it
const svgRef = ref(null);

// Reactive dimensions for the SVG, will be updated by ResizeObserver
const svgWidth = ref(900);
const svgHeight = ref(200);

let scale; // D3 scale instance
let resizeObserver; // To observe container resizing

/**
 * Creates a custom piecewise linear scale function based on majorTicks and weights.
 * @param {number} totalDimension The total dimension of the SVG (width for horizontal, height for vertical).
 * @param {number[]} majorTicks The array of domain values that define the segments.
 * @param {number[]} weights The array of proportional lengths for each segment.
 * @param {string} orientation 'horizontal' or 'vertical'.
 * @param {number} padding The padding in pixels at the ends of the scale.
 * @returns {function} A function that maps a domain value to a pixel position.
 */
function createCustomScale(totalDimension, majorTicks, weights, orientation, padding) {
    if (majorTicks.length < 2 || weights.length !== (majorTicks.length - 1)) {
        console.error("Invalid majorTicks or weights array for custom scale creation.");
        // Fallback to a simple linear scale if inputs are invalid
        const defaultDomain = [-10, 10];
        return d3.scaleLinear().domain(defaultDomain).range(orientation === 'horizontal' ? [padding, totalDimension - padding] : [totalDimension - padding, padding]);
    }

    const sortedMajorTicks = [...majorTicks].sort((a, b) => a - b); // Ensure sorted

    let startPx, endPx, effectiveLength;

    if (orientation === 'horizontal') {
        startPx = padding;
        endPx = totalDimension - padding;
        effectiveLength = endPx - startPx;
    } else { // vertical
        startPx = totalDimension - padding; // Scale starts from bottom (higher pixel value)
        endPx = padding; // Scale ends at top (lower pixel value)
        effectiveLength = startPx - endPx;
    }

    const rangePoints = {};
    let currentPixelPosition = startPx;

    // Set the first range point
    rangePoints[sortedMajorTicks[0]] = currentPixelPosition;

    // Calculate pixel positions for each major tick based on weights
    for (let i = 0; i < sortedMajorTicks.length - 1; i++) {
        const segmentLengthPx = weights[i] * effectiveLength;
        if (orientation === 'horizontal') {
            currentPixelPosition += segmentLengthPx;
        } else { // vertical
            currentPixelPosition -= segmentLengthPx; // Decrement for vertical scale (top is smaller pixel)
        }
        rangePoints[sortedMajorTicks[i + 1]] = currentPixelPosition;
    }

    const customScale = (value) => {
        // Find the correct segment for the given value
        for (let i = 0; i < sortedMajorTicks.length - 1; i++) {
            const domainStart = sortedMajorTicks[i];
            const domainEnd = sortedMajorTicks[i + 1];
            const rangeStart = rangePoints[domainStart];
            const rangeEnd = rangePoints[domainEnd];

            if ((value >= domainStart && value <= domainEnd) || (value <= domainStart && value >= domainEnd)) {
                return d3.scaleLinear().domain([domainStart, domainEnd]).range([rangeStart, rangeEnd])(value);
            }
        }
        // Fallback if value is outside the defined majorTicks range
        const firstMajorTick = sortedMajorTicks[0];
        const lastMajorTick = sortedMajorTicks[sortedMajorTicks.length - 1];
        const firstRangePoint = rangePoints[firstMajorTick];
        const lastRangePoint = rangePoints[lastMajorTick];
        return d3.scaleLinear().domain([firstMajorTick, lastMajorTick]).range([firstRangePoint, lastRangePoint])(value);
    };

    customScale.domain = () => [sortedMajorTicks[0], sortedMajorTicks[sortedMajorTicks.length - 1]];
    customScale.range = () => (orientation === 'horizontal' ? [rangePoints[sortedMajorTicks[0]], rangePoints[sortedMajorTicks[sortedMajorTicks.length - 1]]] : [rangePoints[sortedMajorTicks[sortedMajorTicks.length - 1]], rangePoints[sortedMajorTicks[0]]]);
    customScale.effectiveLength = effectiveLength;
    return customScale;
}

/**
 * Updates the position of the indicator triangle and the confidence range box.
 */
function updateIndicatorAndConfidence() {
    if (!scale || !svgRef.value) {
        console.warn("updateIndicatorAndConfidence: Scale or SVG not initialized.");
        return; // Ensure scale and SVG are initialized
    }

    const pos = scale(props.value);
    const effectiveLength = scale.effectiveLength;
    const confidencePx = (props.confidenceRangePercent / 100) * effectiveLength;

    const d3svg = d3.select(svgRef.value);

    // Apply transition duration
    d3svg.selectAll(".indicator-triangle, .confidence-box")
        .style("transition", `all ${props.transitionDuration}s ease-out`);

    // Update indicator position
    d3svg.select(".indicator-triangle")
        .attr("transform", props.orientation === 'horizontal' ?
            `translate(${pos}, 0)` :
            `translate(0, ${pos})`)
        .style("fill", props.indicatorColor)
        .style("fill-opacity", props.indicatorOpacity);

    // Update confidence box
    d3svg.select(".confidence-box")
        .style("fill", props.confidenceColor)
        .style("fill-opacity", props.confidenceOpacity);

    if (props.orientation === 'horizontal') {
        d3svg.select(".confidence-box")
            .attr("x", pos - confidencePx / 2)
            .attr("y", svgHeight.value / 2 - (props.confidenceBoxCrossDimension / 2))
            .attr("width", confidencePx)
            .attr("height", props.confidenceBoxCrossDimension);
    } else { // vertical
        d3svg.select(".confidence-box")
            .attr("x", svgWidth.value / 2 - (props.confidenceBoxCrossDimension / 2))
            .attr("y", pos - confidencePx / 2)
            .attr("width", props.confidenceBoxCrossDimension)
            .attr("height", confidencePx);
    }
}

/**
 * Draws or redraws the entire scale based on current props and dynamic dimensions.
 */
function drawScale() {
    if (!svgRef.value) {
        console.error("drawScale: SVG element is null. Cannot draw scale.");
        return; // Ensure SVG element is available
    }

    console.log("Drawing scale. Orientation:", props.orientation);
    console.log("Current Padding:", props.scalePadding);
    console.log("SVG Dimensions:", svgWidth.value, svgHeight.value);
    console.log("Major Ticks:", props.majorTicks);
    console.log("Minor Ticks:", props.minorTicks);
    console.log("Intermediate Ticks:", props.intermediateTicks);
    console.log("Weights:", props.weights);

    const d3svg = d3.select(svgRef.value);
    d3svg.selectAll("*").remove(); // Clear previous SVG content

    let scaleLinePos;
    let indicatorPoints;

    const indicatorSize = props.indicatorSize;
    const indicatorColor = props.indicatorColor;
    const indicatorOpacity = props.indicatorOpacity;
    const indicatorDistancePercent = props.indicatorDistancePercent;
    const confidenceOpacity = props.confidenceOpacity;
    const confidenceColor = props.confidenceColor;
    const confidenceBoxCrossDimension = props.confidenceBoxCrossDimension;
    const transitionDuration = props.transitionDuration;

    // Set SVG dimensions and viewBox based on orientation and current size
    if (props.orientation === 'horizontal') {
        d3svg.attr("width", svgWidth.value)
            .attr("height", svgHeight.value)
            .attr("viewBox", `0 0 ${svgWidth.value} ${svgHeight.value}`);
        scale = createCustomScale(svgWidth.value, props.majorTicks, props.weights, props.orientation, props.scalePadding);
        scaleLinePos = svgHeight.value / 2; // Center vertically using dynamic height

        // Calculate indicator position based on distance percentage of current SVG height
        const indicatorDistancePx = (indicatorDistancePercent / 100) * svgHeight.value;
        // Indicator points DOWN towards the scale line (from above)
        indicatorPoints = `0,${scaleLinePos - indicatorDistancePx + indicatorSize} -${indicatorSize / 2},${scaleLinePos - indicatorDistancePx} ${indicatorSize / 2},${scaleLinePos - indicatorDistancePx}`;
    } else { // vertical
        d3svg.attr("width", svgWidth.value)
            .attr("height", svgHeight.value)
            .attr("viewBox", `0 0 ${svgWidth.value} ${svgHeight.value}`);
        scale = createCustomScale(svgHeight.value, props.majorTicks, props.weights, props.orientation, props.scalePadding);
        scaleLinePos = svgWidth.value / 2; // Center horizontally using dynamic width

        // Calculate indicator position based on distance percentage of current SVG width
        const indicatorDistancePx = (indicatorDistancePercent / 100) * svgWidth.value;
        // Indicator points LEFT towards the scale line (from right)
        indicatorPoints = `${scaleLinePos - indicatorDistancePx + indicatorSize},0 ${scaleLinePos - indicatorDistancePx}, -${indicatorSize / 2} ${scaleLinePos - indicatorDistancePx},${indicatorSize / 2}`;
    }

    console.log("Scale range after creation:", scale.range());

    // Draw the main scale line
    d3svg.append("line")
        .attr("class", "scale-line")
        .attr(props.orientation === 'horizontal' ? "x1" : "y1", scale.range()[0])
        .attr(props.orientation === 'horizontal' ? "y1" : "x1", scaleLinePos)
        .attr(props.orientation === 'horizontal' ? "x2" : "y2", scale.range()[1])
        .attr(props.orientation === 'horizontal' ? "y2" : "x2", scaleLinePos)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);

    // Combine all tick values, ensuring uniqueness and sorting for consistent rendering
    const allTickValues = [...new Set([
        ...props.majorTicks,
        ...props.minorTicks,
        ...props.intermediateTicks
    ])].sort((a, b) => a - b);

    console.log("All tick values for rendering:", allTickValues);

    // Create a group for each tick mark
    d3svg.selectAll(".tick")
        .data(allTickValues)
        .enter()
        .append("g")
        .attr("class", "tick")
        .attr("transform", d => {
            const pos = scale(d);
            return props.orientation === 'horizontal' ?
                `translate(${pos}, ${scaleLinePos})` :
                `translate(${scaleLinePos}, ${pos})`;
        })
        .each(function (d) {
            const g = d3.select(this);
            let tickLength;
            let strokeColor = "#666";
            let textColor = "#333";
            let textWeight = "normal";
            let showText = false;

            if (props.majorTicks.includes(d)) {
                tickLength = 20;
                strokeColor = "#333";
                textWeight = "bold";
                showText = true;
                g.classed("major-tick", true);
            } else if (props.intermediateTicks.includes(d)) {
                tickLength = 10;
                strokeColor = "#666";
                textWeight = "normal";
            } else if (props.minorTicks.includes(d)) {
                tickLength = 5;
                strokeColor = "#666";
                textWeight = "normal";
            } else {
                // Fallback for any other numbers that might sneak in, though ideally
                // all tick values are explicitly defined in the props arrays
                tickLength = 5;
                strokeColor = "#ccc";
                textWeight = "normal";
            }

            // Append the tick line with explicit stroke and stroke-width
            g.append("line")
                .attr(props.orientation === 'horizontal' ? "x1" : "y1", 0)
                .attr(props.orientation === 'horizontal' ? "y1" : "x1", 0)
                .attr(props.orientation === 'horizontal' ? "x2" : "y2", 0)
                .attr(props.orientation === 'horizontal' ? "y2" : "x2", tickLength)
                .attr("stroke", strokeColor)
                .attr("stroke-width", showText ? 2 : 1); // Thicker for major ticks

            // Add text labels only if showText is true (i.e., for major ticks)
            if (showText) {
                g.append("text")
                    .attr(props.orientation === 'horizontal' ? "y" : "x", tickLength + props.majorTickTextOffset) // Use new prop here
                    .attr(props.orientation === 'horizontal' ? "text-anchor" : "dominant-baseline", props.orientation === 'horizontal' ? "middle" : "middle") // Vertically center for vertical ticks
                    .attr("fill", textColor)
                    .style("font-weight", textWeight)
                    .text(d);
            }
        });

    // Add the confidence range box (drawn first so indicator is on top)
    d3svg.append("rect")
        .attr("class", "confidence-box")
        .attr("rx", 4)
        .attr("ry", 4);

    // Add the indicator triangle
    d3svg.append("polygon")
        .attr("class", "indicator-triangle")
        .attr("points", indicatorPoints);

    // Initial update of indicator and confidence box
    updateIndicatorAndConfidence();
}

// On component mount, draw the initial scale
onMounted(() => {
    // Initialize ResizeObserver
    resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.contentBoxSize) {
                const newWidth = entry.contentBoxSize[0].inlineSize;
                const newHeight = entry.contentBoxSize[0].blockSize;
                if (svgWidth.value !== newWidth || svgHeight.value !== newHeight) {
                    svgWidth.value = newWidth;
                    svgHeight.value = newHeight;
                    drawScale();
                }
            }
        }
    });

    if (svgRef.value && svgRef.value.parentElement) {
        resizeObserver.observe(svgRef.value.parentElement);
    }

    if (svgRef.value && svgRef.value.parentElement) {
        svgWidth.value = svgRef.value.parentElement.clientWidth;
        svgHeight.value = svgRef.value.parentElement.clientHeight;
        drawScale();
    }
});

// Clean up ResizeObserver on unmount
onUnmounted(() => {
    if (resizeObserver && svgRef.value && svgRef.value.parentElement) {
        resizeObserver.unobserve(svgRef.value.parentElement);
    }
});

// Watch for changes in relevant props to redraw or update the scale elements
watch(
    [
        () => props.value,
        () => props.confidenceRangePercent,
        () => props.indicatorColor,
        () => props.indicatorOpacity,
        () => props.confidenceColor,
        () => props.confidenceOpacity,
        () => props.confidenceBoxCrossDimension,
        () => props.transitionDuration
    ],
    () => {
        updateIndicatorAndConfidence();
    }
);

// Watch for changes in props that require a full redraw of the scale
watch(
    [
        () => props.orientation,
        () => props.scalePadding,
        () => props.majorTicks, // Watch new props
        () => props.minorTicks,
        () => props.intermediateTicks,
        () => props.weights,
        () => props.indicatorSize,
        () => props.indicatorDistancePercent,
        () => props.majorTickTextOffset // Watch the new prop
    ],
    () => {
        drawScale();
    },
    { deep: true } // Use deep watch for array props
);
</script>

<template>
    <svg ref="svgRef"></svg>
</template>

<style scoped>
/* Scoped styles for the LinearScale component */
svg {
    display: block;
    width: 100%;
    height: 100%;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tick line {
    stroke: #666;
    stroke-width: 1px;
}

.tick text {
    font-size: 14px;
    fill: #333;
    text-anchor: middle;
}

.major-tick line {
    stroke: #333;
    stroke-width: 2px;
}

.major-tick text {
    font-weight: 700;
}

.indicator-triangle {
    border-radius: 4px;
}

.confidence-box {
    border-radius: 4px;
}

/* New style for the main scale line */
.scale-line {
    stroke: #333;
    stroke-width: 2px;
}
</style>

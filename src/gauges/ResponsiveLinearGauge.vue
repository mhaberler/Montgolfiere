<template>
    <div ref="containerRef"
        class="relative w-full h-full bg-white p-1 sm:p-5 flex flex-col justify-between items-center text-center transition-all duration-300 ease-in-out transform hover:scale-105 border-1 border-black">
        <h2 class="flex-shrink-0">{{ title }}</h2>
        <div class="gauges-wrapper flex-grow flex items-center justify-center">
            <div class="gauge-section">
                <canvas ref="gaugeCanvas" class="speed-gauge"></canvas>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { LinearGauge } from 'canvas-gauges'

// Define props for external data input and range configuration
const props = defineProps({
    // External data inputs
    value: {
        type: Number,
        default: 0
    },
    // Speed gauge range configuration
    minvalue: {
        type: Number,
        default: -5
    },
    maxvalue: {
        type: Number,
        default: 5
    },
    rangeticks: {
        type: Number,
        default: 10
    },
    majorticks: {
        type: Array,
        default: () => []
        // default: () => ['-5', '-4', '-3', '-2', '-1', '0', '1', '2', '3', '4', '5']
    },

    // Display options
    title: {
        type: String,
        default: ''
    },
})

const maxW = 140;
const maxH = 240;
// Reactive values
const containerRef = ref(null)
const gaugeCanvas = ref(null)
const gaugeWidth = ref(maxW)
const gaugeHeight = ref(maxH)

let gauge = null
let resizeObserver = null

const transformValue = (v) => {
    return v;
}

// Measure container and update gauge dimensions
const updateDimensions = () => {
    if (!containerRef.value) return

    const container = containerRef.value
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    // console.log("-- gauge container: ", containerWidth, containerHeight)

    // Calculate available space for the gauge (accounting for padding and title)
    const padding = 0 // Total padding (p-1 sm:p-5 = roughly 20px each side)
    const titleHeight = 0 // Approximate title height

    const availableWidth = Math.max(maxW, containerWidth - padding)
    const availableHeight = Math.max(maxH, containerHeight - titleHeight - padding)
    // console.log("-- gauge avail: ", availableWidth, availableHeight)

    const cw = Math.max(60, availableWidth * 1.0)
    const ch = Math.max(150, availableHeight * 1.0)
    // console.log("-- gauge cwh :", cw,ch)

    // Set gauge dimensions (with some constraints for readability)
    gaugeWidth.value = Math.min(maxW, Math.max(60, availableWidth * 0.8))
    gaugeHeight.value = Math.min(maxH, Math.max(150, availableHeight * 0.8))

    // console.log("-- gauge:", gaugeWidth.value, gaugeHeight.value)
    // const padding = 0 // Total padding (p-1 sm:p-5 = roughly 20px each side)
    // const titleHeight = 0 // Approximate title height

    // const availableWidth = Math.max(0, containerWidth - padding)
    // const availableHeight = Math.max(9, containerHeight - titleHeight - padding)

    // // Set gauge dimensions (with some constraints for readability)
    // gaugeWidth.value = Math.max(maxW, containerWidth)
    // gaugeHeight.value = Math.max(maxH, containerHeight)


    // Reinitialize gauge with new dimensions if it exists
    if (gauge) {
        gauge.destroy()
        initgauge()
    }
}
function getTickMarks(min, max, tickCount) {
    const step = (max - min) / (tickCount);
    // for (let i = 0; i <= tickCount; i++) {
    //     console.log(min + i * step, Math.round(min + i * step))
    // }
    const t =  Array.from({ length: tickCount+1}, (_, i) => Math.round(min + i * step));
    return t;
}

// Initialize the gauge
const initgauge = () => {
    if (!gaugeCanvas.value) return

    gauge = new LinearGauge({
        valueBox: false,
        renderTo: gaugeCanvas.value,

        width: gaugeWidth.value,
        height: gaugeHeight.value,

        minValue: props.minvalue,
        maxValue: props.maxvalue,
        value: props.value,

        barBeginCircle: 0,

        // Vertical orientation
        orientation: 'vertical',
        barProgress: false,
        barWidth: 0,
        borders: true,

        needleType: 'arrow',
        needleSide: 'left',
        needleShadow: false,
        needleStart: gaugeWidth.value * 1.1,
        needleEnd: gaugeWidth.value * 1.8,
        needleWidth: gaugeHeight.value * 0.15,

        fontNumbersSize: 30,
        fontNumbersWeight: 'bolder',
        tickSide: 'right',
        numberSide: 'right',

        animationDuration: 100,
        animationRule: 'linear',

        // Colors
        colorNeedle: '#2196F3',
        colorNeedleEnd: '#2196F3',
        colorNeedleCircle: '#2196F3',

        // Custom tick positioning for configurable scale
        majorTicks: getTickMarks(props.minvalue, props.maxvalue, props.rangeticks), //       props.majorticks,
        minorTicks: 0,
        ticksWidth: gaugeWidth.value * 0.08,
        strokeTicks: true,

        // Highlights for zero reference
        highlightsWidth: gaugeWidth.value * 0.08,
        highlights: [
            { from: props.minvalue * 0.05, to: props.maxvalue * 0.05, color: '#4CAF50' }
        ],

        // Custom number formatting to show actual values
        valueFormat: (value) => {
            return value;
        },
    })

    gauge.draw()
}

// Watch for prop changes and update gauges
watch(() => props.value, (newValue) => {
    if (gauge) {
        gauge.value = transformValue(newValue)
    }
})

onMounted(() => {
    // Set up ResizeObserver to watch container size changes
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
        resizeObserver = new ResizeObserver(() => {
            updateDimensions()
        })
        resizeObserver.observe(containerRef.value)
    }

    // Initial dimension calculation and gauge setup
    updateDimensions()
    initgauge()
})

onUnmounted(() => {
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    if (gauge) {
        gauge.destroy()
    }
})
</script>

<style scoped>
/* .gauge-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    font-family: Arial, sans-serif;
}

.gauge-container h2 {
    margin-bottom: 20px;
    color: #333;
}

.values-display {
    display: flex;
    gap: 40px;
    margin-bottom: 20px;
}

.value-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #fff;
    padding: 12px 18px;
    border-radius: 8px;
    min-width: 90px;
    border: 2px solid transparent;
}

.value-item.speed {
    border-color: #2196F3;
}

.value-item.acceleration {
    border-color: #FF5722;
}


.value {
    font-size: 20px;
    font-weight: bold;
    color: #333;
}

.unit {
    font-size: 13px;
    color: #666;
    margin-top: 3px;
}

.gauges-wrapper {
    display: flex;
    gap: 20px;
    background-color: #f8f9fa;
    border-radius: 12px;
    padding: 25px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gauge-section {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.speed-gauge,
.acceleration-gauge {
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.units-display {
    display: flex;
    gap: 60px;
    margin-top: 20px;
}

.unit-label {
    font-size: 16px;
    font-weight: bold;
    color: #555;
    text-align: center;
    min-width: 90px;
}

.unit-label:first-child {
    color: #2196F3;
}

.unit-label:last-child {
    color: #FF5722;
}

.value-item.speed .value {
    color: #2196F3;
}

.value-item.acceleration .value {
    color: #FF5722;
} */
</style>
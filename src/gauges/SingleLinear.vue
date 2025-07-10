<template>
    <div
        class="relative w-full bg-white  p-1 sm:p-5 flex flex-col justify-between items-center text-center transition-all duration-300 ease-in-out transform hover:scale-105 border-1 border-black	">
        <h2>{{ title }}</h2>
        <div class="gauges-wrapper">
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

// Reactive values
const gaugeCanvas = ref(null)
let gauge = null

// Transform  value for display (symlog with threshold 1)
const transformValue = (v) => {
    return v;
}

// const gaugeWidth = 50;
// const gaugeHeight = 100;

const gaugeWidth = 90;
const gaugeHeight = 300;

// Initialize the speed gauge
const initgauge = () => {
    if (!gaugeCanvas.value) return

    gauge = new LinearGauge({
        valueBox: false,
        renderTo: gaugeCanvas.value,

        width: gaugeWidth,
        height: gaugeHeight,
        minValue: props.minvalue,
        maxValue: props.maxvalue,
        value: props.value,

        barBeginCircle: 0,

        // Vertical orientation
        orientation: 'vertical',
        barProgress: false,
        barWidth: 0,
        // Styling

        // borderShadowWidth: 0,
        // borderOuterWidth: 1,
        // borderMiddleWidth: 0,
        // borderInnerWidth: 0,
         borders: true,

        needleType: 'arrow',
        needleSide: 'left',
        needleShadow: false,
        needleStart: 70,
        needleEnd: 200,
        needleWidth: gaugeHeight * 0.25,

        tickSide: 'right',
        numberSide: 'right',

        // needleEnd: 100,
        // needleCircleSize: 8,
        // needleCircleOuter: true,
        // needleCircleInner: false,


        animationDuration: 150,
        animationRule: 'linear',

        // Colors
        // colorPlate: '#fff',
        // colorMajorTicks: '#444',
        // colorMinorTicks: '#666',
        // colorTitle: '#333',
        // colorUnits: '#333',
        // colorNumbers: '#333',
        colorNeedle: '#2196F3',
        colorNeedleEnd: '#2196F3',
        colorNeedleCircle: '#2196F3',

        // Custom tick positioning for configurable scale
        majorTicks: props.majorticks,
        minorTicks: 0,
        // Formatting
        ticksWidth: 10,
        strokeTicks: true,


        // Highlights for zero reference
        highlights: [
            { from: -0.1, to: 0.1, color: '#4CAF50', width: 50 }
        ],



        // Custom number formatting to show actual values
        valueFormat: (value) => {
            return value;
        },

        // Needle shadow
        // needleShadow: true,
        // needleShadowBlur: 3,
        // needleShadowOffsetX: 1,
        // needleShadowOffsetY: 1,
        // needleShadowColor: 'rgba(0, 0, 0, 0.2)'
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
    initgauge()
})

onUnmounted(() => {
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
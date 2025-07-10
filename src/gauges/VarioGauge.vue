<template>
    <div class="gauge-container">
        <h2>{{ title }}</h2>


        <div class="gauges-wrapper">
            <!-- Speed Gauge -->
            <div class="gauge-section">
                <canvas ref="speedGaugeCanvas" class="speed-gauge"></canvas>
            </div>

            <!-- Acceleration Gauge -->
            <div class="gauge-section">
                <canvas ref="accelGaugeCanvas" class="acceleration-gauge"></canvas>
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
    speed: {
        type: Number,
        default: 0
    },
    acceleration: {
        type: Number,
        default: 0
    },
    // Speed gauge range configuration
    speedminvalue: {
        type: Number,
        default: -5
    },
    speedmaxvalue: {
        type: Number,
        default: 5
    },
    speedmajorticks: {
        type: Array,
        default: () => []
        // default: () => ['-5', '-4', '-3', '-2', '-1', '0', '1', '2', '3', '4', '5']
    },
    // Acceleration gauge range configuration
    accelminvalue: {
        type: Number,
        default: -100
    },
    accelmaxvalue: {
        type: Number,
        default: 100
    },
    accelmajorticks: {
        type: Array,
        default: () => ['-100', '-50', '-20', '-10', '0', '10', '20', '50', '100']
    },
    // Display options
    title: {
        type: String,
        default: ''
    },
})

// Reactive values
const speedGaugeCanvas = ref(null)
const accelGaugeCanvas = ref(null)
let speedGauge = null
let accelGauge = null


const inverseSymlog = (value, threshold = 1) => {
    if (Math.abs(value) <= 1) {
        return value * threshold
    }
    return Math.sign(value) * threshold * Math.pow(10, Math.abs(value) - 1)
}

// Transform speed value for display (symlog with threshold 1)
const transformSpeedValue = (speed) => {
    return speed;
    // const transformed = symlog(speed, 1)
    // return Math.max(-4, Math.min(4, transformed)) // Clamp to reasonable display range
}

// Transform acceleration value for display (symlog with threshold 10)
const transformAccelValue = (accel) => {
    return accel;
    // const transformed = symlog(accel, 10)
    // return Math.max(-3, Math.min(3, transformed)) // Clamp to reasonable display range
}

const gaugeWidth = 70;
const gaugeHeight= 300;

// const gaugeWidth = 200;
// const gaugeHeight = 500;

// Initialize the speed gauge
const initSpeedGauge = () => {
    if (!speedGaugeCanvas.value) return

    speedGauge = new LinearGauge({
        valueBox: false,
        renderTo: speedGaugeCanvas.value,

        width: gaugeWidth,
        height: gaugeHeight,
        minValue: props.speedminvalue,
        maxValue: props.speedmaxvalue,
        value: props.speed,

        barBeginCircle: 0,

        // Vertical orientation
        orientation: 'vertical',
        barProgress: false,
        barWidth: 0,
        // Styling

        // borderShadowWidth: 0,
        // borderOuterWidth: 0,
        // borderMiddleWidth: 0,
        // borderInnerWidth: 0,
        borders: false,

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
        majorTicks: props.speedmajorticks,
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

    speedGauge.draw()
}

// Initialize the acceleration gauge
const initAccelGauge = () => {
    if (!accelGaugeCanvas.value) return

    accelGauge = new LinearGauge({
        valueBox: false,

        renderTo: accelGaugeCanvas.value,
        width: gaugeWidth,
        height: gaugeHeight,
        minValue: props.accelminvalue,
        maxValue: props.accelmaxvalue,
        value: props.acceleration,

        barBeginCircle: 0,
        // Vertical orientation
        orientation: 'vertical',
        barProgress: false,
        barWidth: 0,
        // Styling
        borderShadowWidth: 0,

        // Styling

        borders: false,

        needleType: 'arrow',
        needleSide: 'right',
        needleShadow: false,
        needleStart: 70,
        needleEnd: 200,
        needleWidth: gaugeHeight * 0.25,

        tickSide: 'left',
        numberSide: 'left',

        // Custom tick positioning for configurable scale
        majorTicks: props.accelmajorticks,
        minorTicks: 0,
        // Formatting
        ticksWidth: 8,
        strokeTicks: true,

        // needleType: 'arrow',
        // needleWidth: 10,
        // needleCircleSize: 0,
        // needleCircleOuter: false,
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
        colorNeedle: '#FF5722',
        colorNeedleEnd: '#FF5722',
        colorNeedleCircle: '#FF5722',




        // Highlights for zero reference
        highlights: [
            { from: -20, to: 20, color: '#4CAF50', width: 50 }
        ],



        // Custom number formatting to show actual values
        valueFormat: (value) => {
            const actualValue = inverseSymlog(value, 10)
            if (Math.abs(actualValue) < 1) return '0'
            return actualValue.toFixed(0)
        },

        // Needle shadow
        // needleShadow: true,
        // needleShadowBlur: 3,
        // needleShadowOffsetX: 1,
        // needleShadowOffsetY: 1,
        // needleShadowColor: 'rgba(0, 0, 0, 0.2)'
    })

    accelGauge.draw()
}

// Watch for prop changes and update gauges
watch(() => props.speed, (newSpeed) => {
    if (speedGauge) {
        speedGauge.value = transformSpeedValue(newSpeed)
    }
})

watch(() => props.acceleration, (newAccel) => {
    if (accelGauge) {
        accelGauge.value = transformAccelValue(newAccel)
    }
})


onMounted(() => {
    initSpeedGauge()
    initAccelGauge()
})

onUnmounted(() => {
    if (speedGauge) {
        speedGauge.destroy()
    }
    if (accelGauge) {
        accelGauge.destroy()
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
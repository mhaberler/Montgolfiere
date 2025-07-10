<template>
    <div class="gauge-container">
        <h2>Temperature Monitor</h2>
        <div class="gauge-wrapper">
            <canvas ref="gaugeCanvas" class="temperature-gauge"></canvas>
        </div>
        <div class="temperature-display">
            {{ temperature.toFixed(1) }}°C
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { LinearGauge } from 'canvas-gauges'

// Reactive temperature value
const temperature = ref(25)
const gaugeCanvas = ref(null)
let gauge = null
let intervalId = null

// Initialize the gauge
const initGauge = () => {
    if (!gaugeCanvas.value) return

    gauge = new LinearGauge({
        renderTo: gaugeCanvas.value,
        width: 120,
        height: 400,
        minValue: 0,
        maxValue: 120,
        value: temperature.value,

        // Vertical orientation
        orientation: 'vertical',

        // Styling
        borderShadowWidth: 0,
        borders: false,
        needleType: 'arrow',
        needleWidth: 2,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        animationDuration: 1000,
        animationRule: 'linear',

        // Colors
        colorPlate: '#fff',
        colorMajorTicks: '#444',
        colorMinorTicks: '#666',
        colorTitle: '#333',
        colorUnits: '#333',
        colorNumbers: '#333',
        colorNeedle: '#cc0000',
        colorNeedleEnd: '#cc0000',
        colorNeedleCircle: '#cc0000',

        // Ticks
        majorTicks: ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120'],
        minorTicks: 2,

        // Highlights (color zones)
        highlights: [
            { from: 0, to: 30, color: '#4CAF50' },    // Cold - Green
            { from: 30, to: 70, color: '#FF9800' },   // Warm - Orange
            { from: 70, to: 120, color: '#F44336' }   // Hot - Red
        ],

        // Title and units
        title: 'Temperature',
        units: '°C',

        // Number formatting
        ticksWidth: 10,
        ticksWidthMinor: 5,
        strokeTicks: true,

        // Needle shadow
        needleShadow: true,
        needleShadowBlur: 5,
        needleShadowOffsetX: 2,
        needleShadowOffsetY: 2,
        needleShadowColor: 'rgba(0, 0, 0, 0.3)'
    })

    gauge.draw()
}

// Simulate temperature changes
const simulateTemperatureChanges = () => {
    intervalId = setInterval(() => {
        // Generate random temperature between 0 and 120
        const newTemp = Math.random() * 120
        temperature.value = newTemp

        // Update gauge value
        if (gauge) {
            gauge.value = newTemp
        }
    }, 2000) // Update every 2 seconds
}

onMounted(() => {
    initGauge()
    simulateTemperatureChanges()
})

onUnmounted(() => {
    if (intervalId) {
        clearInterval(intervalId)
    }
    if (gauge) {
        gauge.destroy()
    }
})
</script>

<style scoped>
.gauge-container {
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

.gauge-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f5f5f5;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.temperature-gauge {
    border-radius: 5px;
}

.temperature-display {
    margin-top: 20px;
    font-size: 24px;
    font-weight: bold;
    color: #333;
    background-color: #fff;
    padding: 10px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
</style>
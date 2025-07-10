<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Responsive Gauge Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="dashboard-content">
      <div class="dashboard-grid">
        <!-- Large gauge - takes up 2x2 grid cells -->
        <div class="gauge-container large">
          <SingleLinear
            :value="mainSpeed"
            :minvalue="-10"
            :maxvalue="10"
            :majorticks="['-10', '-5', '0', '5', '10']"
            title="Primary Speed"
          />
        </div>

        <!-- Medium gauges - take up 1x2 grid cells -->
        <div class="gauge-container medium">
          <SingleLinear
            :value="acceleration"
            :minvalue="-100"
            :maxvalue="100"
            :majorticks="['-100', '-50', '0', '50', '100']"
            title="Acceleration"
          />
        </div>

        <div class="gauge-container medium">
          <SingleLinear
            :value="altitude"
            :minvalue="0"
            :maxvalue="1000"
            :majorticks="['0', '250', '500', '750', '1000']"
            title="Altitude"
          />
        </div>

        <!-- Small gauges - take up 1x1 grid cells -->
        <div class="gauge-container small">
          <SingleLinear
            :value="temperature"
            :minvalue="-20"
            :maxvalue="40"
            :majorticks="['-20', '0', '20', '40']"
            title="Temperature"
          />
        </div>

        <div class="gauge-container small">
          <SingleLinear
            :value="pressure"
            :minvalue="900"
            :maxvalue="1100"
            :majorticks="['900', '1000', '1100']"
            title="Pressure"
          />
        </div>

        <div class="gauge-container small">
          <SingleLinear
            :value="humidity"
            :minvalue="0"
            :maxvalue="100"
            :majorticks="['0', '25', '50', '75', '100']"
            title="Humidity"
          />
        </div>

        <!-- Wide gauge - takes up 2x1 grid cells -->
        <div class="gauge-container wide">
          <SingleLinear
            :value="battery"
            :minvalue="0"
            :maxvalue="100"
            :majorticks="['0', '25', '50', '75', '100']"
            title="Battery Level"
          />
        </div>
      </div>

      <!-- Controls for demonstration -->
      <div class="controls">
        <ion-button @click="simulateData" fill="outline">
          <ion-icon name="refresh-outline" slot="start"></ion-icon>
          Simulate Data
        </ion-button>
        <ion-button @click="resetData" fill="outline" color="secondary">
          <ion-icon name="stop-outline" slot="start"></ion-icon>
          Reset
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon
} from '@ionic/vue'
import SingleLinear from '@/gauges/SingleLinear.vue'

// Reactive data for gauges
const mainSpeed = ref(0)
const acceleration = ref(0)
const altitude = ref(500)
const temperature = ref(20)
const pressure = ref(1013)
const humidity = ref(50)
const battery = ref(85)

let simulationInterval = null

// Simulate changing data
const simulateData = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval)
  }

  simulationInterval = setInterval(() => {
    // Generate realistic-looking data with some correlation
    mainSpeed.value = Math.sin(Date.now() / 2000) * 8 + Math.random() * 2 - 1
    acceleration.value = Math.cos(Date.now() / 1500) * 60 + Math.random() * 20 - 10
    altitude.value = 500 + Math.sin(Date.now() / 5000) * 200 + Math.random() * 50 - 25
    temperature.value = 20 + Math.sin(Date.now() / 8000) * 15 + Math.random() * 4 - 2
    pressure.value = 1013 + Math.sin(Date.now() / 6000) * 50 + Math.random() * 10 - 5
    humidity.value = 50 + Math.cos(Date.now() / 4000) * 30 + Math.random() * 10 - 5
    battery.value = Math.max(0, Math.min(100, battery.value + (Math.random() * 2 - 1)))
  }, 200)
}

// Reset all data to defaults
const resetData = () => {
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  
  mainSpeed.value = 0
  acceleration.value = 0
  altitude.value = 500
  temperature.value = 20
  pressure.value = 1013
  humidity.value = 50
  battery.value = 85
}

onMounted(() => {
  // Start with some demo data
  simulateData()
})

onUnmounted(() => {
  if (simulationInterval) {
    clearInterval(simulationInterval)
  }
})
</script>

<style scoped>
.dashboard-content {
  --background: #f5f5f5;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: minmax(200px, auto);
  gap: 16px;
  padding: 16px;
  height: calc(100vh - 200px); /* Account for header and controls */
}

/* Different sized containers */
.gauge-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease;
}

.gauge-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* Large container - 2x2 on larger screens */
.gauge-container.large {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 400px;
}

/* Medium container - 1x2 */
.gauge-container.medium {
  grid-row: span 2;
  min-height: 300px;
}

/* Small container - 1x1 */
.gauge-container.small {
  min-height: 200px;
}

/* Wide container - 2x1 */
.gauge-container.wide {
  grid-column: span 2;
  min-height: 200px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
  }
  
  .gauge-container.large,
  .gauge-container.wide {
    grid-column: span 1;
  }
  
  .gauge-container.large {
    grid-row: span 1;
    min-height: 250px;
  }
  
  .gauge-container.medium {
    grid-row: span 1;
    min-height: 200px;
  }
}

@media (max-width: 480px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    height: calc(100vh - 180px);
  }
  
  .gauge-container {
    min-height: 180px;
  }
}

.controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

@media (max-width: 480px) {
  .controls {
    bottom: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    justify-content: center;
  }
}
</style>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Barometer</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Barometer</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="sensor-container">
        <ion-text class="sensor-status" :color="hasBarometer ? 'success' : 'medium'">
          <h2>Barometer Sensor: {{ hasBarometer ? 'Available' : 'Not Available' }}</h2>
        </ion-text>

        <ion-text class="sensor-reading">
          <h3>Pressure</h3>
          <p class="reading-value">{{ pressure.toFixed(4) }} <span class="unit">hPa</span></p>
        </ion-text>

        <ion-text class="sensor-reading">
          <h3>Altitude</h3>
          <p class="reading-value">{{ altitude.toFixed(2) }} <span class="unit">m</span></p>
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText } from '@ionic/vue';
import { Barometer } from 'capacitor-barometer';
import BalloonEKF  from '../BalloonEKF';

// Define interfaces for type safety
interface BarometerAvailable {
  available: boolean;
}

const hasBarometer = ref(false);
const pressure = ref(1013.25);
const altitude = ref(0);
const message = ref<string>('');
const ekf = ref<BalloonEKF>();

const initBarometer = async () => {
  try {
    const result = await Barometer.isAvailable() as BarometerAvailable;
    hasBarometer.value = result.available;

    if (result.available) {
      // Listen for pressure changes
      Barometer.addListener('onPressureChange', (event) => {
        console.error("---------------baro event:", JSON.stringify(event));
        pressure.value = event.pressure
        altitude.value = calculateAltitude(event.pressure);
      });
      await Barometer.start();
    }
  } catch (err) {
    const error = err as Error;
    message.value = `Error: ${error.message || 'Unknown error occurred'}`;
    console.error('Barometer error:', error);
  }
};

const calculateAltitude = (pressureHpa: number): number => {
  const STANDARD_PRESSURE = 1013.25;
  return 44330 * (1 - Math.pow(pressureHpa / STANDARD_PRESSURE, 1 / 5.255));
};

// Call initialization when component mounts
onMounted(() => {
  initBarometer();
  ekf.value = new BalloonEKF();
});

// Cleanup when component unmounts
onUnmounted(async () => {
  if (hasBarometer.value) {
    await Barometer.stop();
    await Barometer.removeAllListeners();
  }
});
</script>

<style scoped>
.sensor-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
}

.sensor-status h2 {
  text-align: center;
  font-size: 1.2rem;
  font-weight: 500;
}

.sensor-reading {
  text-align: center;
}

.sensor-reading h3 {
  color: var(--ion-color-medium);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.reading-value {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
}

.unit {
  font-size: 1rem;
  color: var(--ion-color-medium);
}
</style>

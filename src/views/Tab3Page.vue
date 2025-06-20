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
        <ion-button @click="toggleBarometer" :disabled="!hasBarometer">
          {{ baroActive ? 'Stop Barometer' : 'Start Barometer' }}
        </ion-button>

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
import { Preferences } from '@capacitor/preferences';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonButton } from '@ionic/vue';
import { Barometer } from 'capacitor-barometer';
import BalloonEKF from '../BalloonEKF';
import { altitudeISAByPres, windspeedMSToKMH } from 'meteojs/calc.js';

interface BarometerAvailable {
  available: boolean;
}

const hasBarometer = ref(false);
const baroActive = ref(false);
const ekf = ref<BalloonEKF>();

const pressure = ref(1013.25);
const altitude = ref(0);
const message = ref<string>('');
const referencePressure = ref(1013.25);

let baroListener: any = null;

const startBarometer = async () => {
  if (baroActive.value) return;
  baroListener = await Barometer.addListener('onPressureChange', (event) => {
    pressure.value = event.pressure;
    altitude.value = altitudeISAByPres(event.pressure) ?? 0;
  });
  await Barometer.start();
  baroActive.value = true;
};

const stopBarometer = async () => {
  if (!baroActive.value) return;
  await Barometer.stop();
  if (baroListener) {
    await baroListener.remove();
    baroListener = null;
  }
  baroActive.value = false;
};

const toggleBarometer = async () => {
  if (baroActive.value) {
    await stopBarometer();
  } else {
    await startBarometer();
  }
};

const initBarometer = async () => {
  try {
    const result = await Barometer.isAvailable() as BarometerAvailable;
    hasBarometer.value = result.available;
    if (result.available) {
      await startBarometer();
    }
  } catch (err) {
    const error = err as Error;
    message.value = `Error: ${error.message || 'Unknown error occurred'}`;
    console.error('Barometer error:', error);
  }
};

const ekfHistoryInfinite = ref(false);
const historySeconds = ref(5);

const loadEKFSettings = async () => {
  const ekfInf = await Preferences.get({ key: 'ekfHistoryInfinite' });
  const histSec = await Preferences.get({ key: 'historySeconds' });
  ekfHistoryInfinite.value = ekfInf.value ? JSON.parse(ekfInf.value) : false;
  historySeconds.value = histSec.value ? JSON.parse(histSec.value) : 5;
};

const loadQNH = async () => {
  const qnh = await Preferences.get({ key: 'qnhPressure' });
  referencePressure.value = qnh.value ? JSON.parse(qnh.value) : 1013.25;
};

onMounted(() => {
  initBarometer();
  ekf.value = new BalloonEKF();
  loadEKFSettings();
  loadQNH();
});

onUnmounted(async () => {
  await stopBarometer();
  await Barometer.removeAllListeners();
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

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label>Barometer</ion-label>
          <ion-toggle v-model="baroEnabled" @ionChange="saveSettings"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>Geolocation</ion-label>
          <ion-toggle v-model="geoEnabled" @ionChange="saveSettings"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>EKF variance history infinite</ion-label>
          <ion-toggle v-model="ekfHistoryInfinite" @ionChange="saveSettings"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>History seconds</ion-label>
          <ion-input
            type="number"
            min="1"
            v-model.number="historySeconds"
            :disabled="ekfHistoryInfinite"
            @ionInput="saveSettings"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>QNH Pressure (hPa)</ion-label>
          <ion-input
            type="number"
            min="800"
            max="1100"
            step="0.01"
            v-model.number="qnhPressure"
            @ionInput="saveSettings"
          ></ion-input>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonToggle, IonInput } from '@ionic/vue';

const baroEnabled = ref(false);
const geoEnabled = ref(false);
const ekfHistoryInfinite = ref(false);
const historySeconds = ref(5);
const qnhPressure = ref(1013.25);

const saveSettings = async () => {
  await Preferences.set({ key: 'baroEnabled', value: JSON.stringify(baroEnabled.value) });
  await Preferences.set({ key: 'geoEnabled', value: JSON.stringify(geoEnabled.value) });
  await Preferences.set({ key: 'ekfHistoryInfinite', value: JSON.stringify(ekfHistoryInfinite.value) });
  await Preferences.set({ key: 'historySeconds', value: JSON.stringify(historySeconds.value) });
  await Preferences.set({ key: 'qnhPressure', value: JSON.stringify(qnhPressure.value) });
};

const loadSettings = async () => {
  const baro = await Preferences.get({ key: 'baroEnabled' });
  const geo = await Preferences.get({ key: 'geoEnabled' });
  const ekfInf = await Preferences.get({ key: 'ekfHistoryInfinite' });
  const histSec = await Preferences.get({ key: 'historySeconds' });
  const qnh = await Preferences.get({ key: 'qnhPressure' });
  baroEnabled.value = baro.value ? JSON.parse(baro.value) : false;
  geoEnabled.value = geo.value ? JSON.parse(geo.value) : false;
  ekfHistoryInfinite.value = ekfInf.value ? JSON.parse(ekfInf.value) : false;
  historySeconds.value = histSec.value ? JSON.parse(histSec.value) : 5;
  qnhPressure.value = qnh.value ? JSON.parse(qnh.value) : 1013.25;
};

onMounted(loadSettings);
</script>
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
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonToggle } from '@ionic/vue';

const baroEnabled = ref(false);
const geoEnabled = ref(false);

const saveSettings = async () => {
  await Preferences.set({ key: 'baroEnabled', value: JSON.stringify(baroEnabled.value) });
  await Preferences.set({ key: 'geoEnabled', value: JSON.stringify(geoEnabled.value) });
};

const loadSettings = async () => {
  const baro = await Preferences.get({ key: 'baroEnabled' });
  const geo = await Preferences.get({ key: 'geoEnabled' });
  baroEnabled.value = baro.value ? JSON.parse(baro.value) : false;
  geoEnabled.value = geo.value ? JSON.parse(geo.value) : false;
};

onMounted(loadSettings);
</script>
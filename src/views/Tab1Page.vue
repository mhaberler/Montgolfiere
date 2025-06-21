<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Location</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Location</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="location-container">
        <ion-text class="sensor-status" :color="geoEnabled ? 'success' : 'medium'">
          <h2>Geolocation: {{ geoEnabled ? 'Available' : 'Not Available' }}</h2>
        </ion-text>

        <ion-card v-if="location">
          <ion-card-header>
            <ion-card-title>Current Location</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Latitude: {{ location.latitude }}</p>
            <p>Longitude: {{ location.longitude }}</p>
            <p v-if="location.accuracy">Accuracy: ±{{ location.accuracy }}m</p>
          </ion-card-content>
        </ion-card>

        <ion-text color="danger" v-if="error">
          {{ error }}
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { watchEffect } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  // IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText
} from '@ionic/vue';

const geoEnabled = ref(false);
const location = ref<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
const error = ref<string | null>(null);
const watching = ref(false);
let watchId: string | null = null;

const startWatching = async () => {
  try {
    watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 500
    }, (position, err) => {
      if (err) {
        error.value = 'Error watching location. Please ensure location permissions are enabled.';
        console.error(err);
        return;
      }
      if (position) {
        location.value = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        error.value = null;
      }
    });
    watching.value = true;
  } catch (e) {
    error.value = 'Error starting location watch.';
    console.error(e);
    watching.value = false;
  }
};

const stopWatching = async () => {
  if (watchId) {
    await Geolocation.clearWatch({ id: watchId });
    watchId = null;
  }
  watching.value = false;
};

// const toggleWatching = async () => {
//   if (watching.value) {
//     await stopWatching();
//   } else {
//     await startWatching();
//   }
// };

// onUnmounted(() => {
//   stopWatching();
// });

const loadGeoSetting = async () => {
  const geo = await Preferences.get({ key: 'geoEnabled' });
  geoEnabled.value = geo.value ? JSON.parse(geo.value) : false;
};

onMounted(loadGeoSetting);

watchEffect(async () => {
  if (geoEnabled.value) {
    await startWatching();
  } else {
    await stopWatching();
  }
});

</script>

<style scoped>
.location-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

ion-card {
  width: 100%;
  max-width: 400px;
}
</style>


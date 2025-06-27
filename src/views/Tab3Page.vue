<template>
  <ion-page>
    <!-- <ion-header>
      <ion-toolbar>
        <ion-title>Status</ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-content :fullscreen="true">
      <DebugEkf v-if="showDebugInfo"></DebugEkf>
    </ion-content>

    <!-- Show message when not in debug mode -->
    <ion-content :fullscreen="true" v-if="!showDebugInfo">
      <ion-card>
        <ion-card-content>
          <p>Status page is only available in development mode.</p>
        </ion-card-content>
      </ion-card>
    </ion-content>

  </ion-page>
</template>


<script setup>
import DebugEkf from '@/components/DebugEkf.vue';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  // IonContent,
  // IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonContent,
  // IonText,
  IonCol, IonGrid, IonRow
} from '@ionic/vue';


import {
  locationAvailable, location, locationError,
  referencePressure,
  useReferencePressure,
  pressure,
  altitudeQNH,
  altitudeISA,
  barometerAvailable,
  ekfAltitude,
  ekfVelocity,
  ekfAcceleration,
  ekfBurnerGain,
  ekfIsDecelerating,
  ekfTimeToZeroSpeed,
  ekfZeroSpeedAltitude,
  ekfZeroSpeedValid

} from '../utils/state';

const showDebugInfo = import.meta.env.MODE === 'development';

// const handleSensorClick = (sensorData) => {
//   console.log('Sensor clicked:', sensorData)
// }
</script>

<style scoped>
.sensor-grid {
  /* gap: 5px; */
}

.sensor-col {
  padding: 0px;
}

.sensor-container {
  /* padding: 0px; */
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  gap: 0px;
  margin-top: 1px
}
</style>
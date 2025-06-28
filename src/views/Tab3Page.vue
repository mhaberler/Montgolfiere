<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Debug info</ion-title>
      </ion-toolbar>
    </ion-header>
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
  // IonCol, IonGrid, IonRow
} from '@ionic/vue';


import {
  // locationAvailable, location, locationError,
  // referencePressure,
  // useReferencePressure,
  // pressure,
  // altitudeQNH,
  // altitudeISA,
  // barometerAvailable,
  // ekfAltitude,
  // ekfVelocity,
  // ekfAcceleration,
  // ekfBurnerGain,
  // ekfIsDecelerating,
  // ekfTimeToZeroSpeed,
  // ekfZeroSpeedAltitude,
  // ekfZeroSpeedValid,
  showDebugInfo

} from '../utils/state';


</script>

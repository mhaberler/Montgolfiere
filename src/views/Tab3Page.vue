<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Debug info</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">

      <CapGo>
      </CapGo>
    </ion-content>

  </ion-page>
</template>


<script setup>

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  // IonButton,
  // IonCard,
  // IonCardHeader,
  // IonCardTitle,
  // IonCardSubtitle,
  // IonCardContent,
  // IonText,
  // IonCol, IonGrid, IonRow
} from '@ionic/vue';

import CapGo from '@/components/CapGo.vue';

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
  // showDebugInfo,
} from '../utils/state';


</script>

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
          <ion-label>use QNH</ion-label>
          <ion-toggle v-model="useReferencePressure"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-label>QNH Pressure (hPa)</ion-label>
          <ion-input type="number" min="800" max="1100" step="1" v-model.number="referencePressure"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>Transition altitude (ft)</ion-label>
          <ion-input type="number" min="0" max="12000" step="1000" v-model.number="transitionAltitude"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>EKF Variance history (sec)</ion-label>
          <ion-input type="number" min="1" max="360" v-model.number="historySeconds"></ion-input>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">

import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonToggle, IonInput } from '@ionic/vue';
import {
  referencePressure,
  useReferencePressure,
  transitionAltitude,
  historySeconds
} from '@/utils/state';
</script>
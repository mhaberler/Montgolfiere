<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Bundle info & updating</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <CapGo> </CapGo>
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
} from '@ionic/vue';

import CapGo from '@/components/CapGo.vue';


</script>

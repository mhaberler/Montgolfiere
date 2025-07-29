<template>
  <ion-page>
    <ion-tabs class="pb-8">
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">

        <ion-tab-button tab="tab1" href="/tabs/tab1">
          <ion-icon aria-hidden="true" :icon="airplaneOutline" />
          <ion-label>Status</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab2" href="/tabs/tab2">
          <ion-icon aria-hidden="true" :icon="bluetoothOutline" />
          <ion-label>Sensors</ion-label>
        </ion-tab-button>


        <ion-tab-button v-if="showDebugInfo"  tab="mdns" href="/tabs/mdns">
          <ion-icon aria-hidden="true" :icon="flashlightOutline" />
          <ion-label>Scan</ion-label>
        </ion-tab-button>

        <ion-tab-button v-if="showDebugInfo"  tab="mqtt" href="/tabs/mqtt">
          <ion-icon aria-hidden="true" :icon="flashOutline" />
          <ion-label>MQTT</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab3" href="/tabs/tab3">
          <ion-icon aria-hidden="true" :icon="cloudDownloadOutline" />
          <ion-label>Update</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-icon aria-hidden="true" :icon="settingsOutline" />
          <ion-label>Settings</ion-label>
        </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabBar, IonTabButton, IonTabs, IonLabel, IonIcon, IonPage, IonRouterOutlet } from '@ionic/vue';
import { airplaneOutline, bluetoothOutline, cloudDownloadOutline, settingsOutline, flashOutline, flashlightOutline } from 'ionicons/icons';
import {
  showDebugInfo,
} from '@/utils/state';
</script>

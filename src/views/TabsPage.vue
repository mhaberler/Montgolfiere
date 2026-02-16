<template>
  <ion-page>
    <ion-tabs class="pb-8">
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom" id="tab-bar">

        <ion-tab-button tab="tab1" href="/tabs/tab1">
          <ion-icon aria-hidden="true" :icon="airplaneOutline" />
          <ion-label>Status</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="tab2" href="/tabs/tab2">
          <ion-icon aria-hidden="true" :icon="bluetoothOutline" />
          <ion-label>Sensors</ion-label>
        </ion-tab-button>

        <ion-tab-button v-if="showDebugInfo" tab="mdns" href="/tabs/mdns">
          <ion-icon aria-hidden="true" :icon="flashlightOutline" />
          <ion-label>Scan</ion-label>
        </ion-tab-button>

        <ion-tab-button v-if="showDebugInfo" tab="mqtt" href="/tabs/mqtt">
          <ion-icon aria-hidden="true" :icon="flashOutline" />
          <ion-label>MQTT</ion-label>
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
import { showDebugInfo } from '@/composables/useAppState';
import { onMounted, onUnmounted } from 'vue';
// import { StatusBar, Style } from '@capacitor/status-bar';

const INACTIVITY_TIME = 5 * 1000; // seconds
let timeoutId: ReturnType<typeof setTimeout> | undefined;

const resetTimer = () => {
  clearTimeout(timeoutId);
  showTabs();
  timeoutId = setTimeout(hideTabs, INACTIVITY_TIME);
};

const hideTabs = () => {
  const tabBar = document.querySelector('#tab-bar') as HTMLElement;
  if (tabBar) tabBar.style.display = 'none';
  // StatusBar.hide();

};

const showTabs = () => {
  const tabBar = document.querySelector('#tab-bar') as HTMLElement;
  if (tabBar) tabBar.style.display = 'flex';
  // StatusBar.show();
};

const setupActivityListeners = () => {
  ['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
    document.addEventListener(event, resetTimer);
  });
};

const removeActivityListeners = () => {
  ['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
    document.removeEventListener(event, resetTimer);
  });
};

onMounted(() => {
  resetTimer();
  setupActivityListeners();
});

onUnmounted(() => {
  clearTimeout(timeoutId);
  removeActivityListeners();
});
</script>


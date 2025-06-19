<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>BLE Scanner</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">BLE Scanner</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="ble-container">
        <ion-button 
          :color="isScanning ? 'danger' : 'primary'"
          @click="toggleScan">
          {{ isScanning ? 'Stop Scan' : 'Start Scan' }}
        </ion-button>

        <ion-list v-if="devices.length > 0">
          <ion-item v-for="device in devices" :key="device.device.deviceId">
            <ion-label>
              <h2>{{ device.device.name || 'Unnamed Device' }}</h2>
              <p>ID: {{ device.device.deviceId }}</p>
              <p>RSSI: {{ device.rssi }} dBm</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <ion-text v-else-if="!isScanning" color="medium">
          <p>No devices found. Start scanning to discover BLE devices.</p>
        </ion-text>

        <ion-spinner v-if="isScanning" name="circles"></ion-spinner>

        <ion-text color="danger" v-if="error">
          {{ error }}
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText
} from '@ionic/vue';

const isScanning = ref(false);
const devices = ref<ScanResult[]>([]);
const error = ref<string | null>(null);

const initialize = async () => {
  try {
    await BleClient.initialize();
  } catch (e) {
    error.value = 'Failed to initialize Bluetooth: ' + (e as Error).message;
  }
};

const toggleScan = async () => {
  try {
    if (isScanning.value) {
      await BleClient.stopLEScan();
      isScanning.value = false;
      return;
    }

    devices.value = [];
    error.value = null;
    isScanning.value = true;

    await BleClient.requestLEScan(
      {
        allowDuplicates: true,
      },
      (result) => {
        console.log("----- BLE", JSON.stringify(result, null, 2));

        // Fix: access deviceId through the device property
        const exists = devices.value.find(d => d.device.deviceId === result.device.deviceId);
        if (!exists) {
          devices.value.push(result);
        }
      }
    );

    // Auto-stop scan after 30 seconds
    setTimeout(async () => {
      if (isScanning.value) {
        await BleClient.stopLEScan();
        isScanning.value = false;
      }
    }, 30000);

  } catch (e) {
    error.value = 'Scan error: ' + (e as Error).message;
    isScanning.value = false;
  }
};

// Initialize BLE when component mounts
initialize();

// Clean up when component unmounts
onUnmounted(async () => {
  if (isScanning.value) {
    await BleClient.stopLEScan();
  }
});
</script>

<style scoped>
.ble-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

ion-list {
  width: 100%;
}

ion-spinner {
  margin: 20px auto;
}
</style>

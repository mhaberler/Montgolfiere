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
        <ion-button :color="isScanning ? 'danger' : 'primary'" @click="toggleScan">
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


/**
 * Converts a Uint8Array (or any array-like of numbers) into a hexadecimal string.
 * Each byte is represented by two hex characters (e.g., 255 becomes "ff").
 * @param {Uint8Array} uint8Array The byte array to convert.
 * @returns {string} The hexadecimal representation of the bytes.
 */
function uint8ArrayToHexString(uint8Array: Uint8Array): string { // Fix 1: Explicitly type uint8Array
  return Array.from(uint8Array)
    .map((b: number) => b.toString(16).padStart(2, '0')) // Fix 2: Explicitly type 'b' as number
    .join(''); // Join all hex strings together
}

/**
 * Serializes an object, converting any DataView attributes into a hexadecimal string
 * representation of their underlying bytes.
 * @param {object} obj The object to serialize.
 * @returns {string} The JSON string representation of the object.
 */
function serializeDataViewToHexString(obj: any): string { // Type 'obj' as 'any' or a more specific interface if you have one
  return JSON.stringify(obj, (key: string, value: any) => { // Type 'key' and 'value' in the replacer
    if (value instanceof DataView) {
      // Create a Uint8Array view over the DataView's buffer segment
      const uint8Array = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      // Convert the Uint8Array to a hexadecimal string
      return {
        _type: "DataView",
        _encoding: "hex",
        data: uint8ArrayToHexString(uint8Array)
      };
    }
    return value;
  }, 2);
}

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
        allowDuplicates: false,
      },
      (result) => {
        const jsonString = serializeDataViewToHexString(result);
        console.log("----- BLE", jsonString);

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

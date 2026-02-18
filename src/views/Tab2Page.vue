<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>BLE Scanner</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="flex gap-2 p-2">
        <ion-button @click="exportMappings">
          Export
        </ion-button>
        <ion-button @click="clearBLEDevices">
          Clear
        </ion-button>
        <ion-button @click="restartBLEScan">
          Restart
        </ion-button>
      </div>
      <div class="p-5 flex flex-col gap-5">
        <ion-list v-if="sortedDevices.length > 0">
          <ion-item v-for="device in sortedDevices" :key="device.scanResult.device.deviceId">
            <ion-label>
              <h2>{{ device.scanResult.device.name || 'Unnamed Device' }}</h2>
              <p>ID: {{ device.scanResult.device.deviceId }}</p>
              <p>RSSI: {{ device.scanResult.rssi }} dBm</p>

              <p v-if="device.decoded.type">
                Type: {{ device.decoded.type }}
              </p>
              <ion-accordion-group v-if="device.decoded.value">
                <ion-accordion>
                  <ion-item slot="header">
                    <ion-label>Sensor Data ({{ Object.keys(device.decoded.value).length }} metrics)</ion-label>
                  </ion-item>
                  <div slot="content" class="p-2">
                    <div v-for="(value, key) in device.decoded.value" :key="key" class="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                      <span class="text-sm text-gray-500 font-medium">{{ key }}:</span>
                      <span class="text-sm font-semibold text-gray-900 tabular-nums">{{ value }}</span>
                    </div>
                  </div>
                </ion-accordion>
              </ion-accordion-group>

              <p v-if="getDeviceUnit(device.scanResult.device.deviceId)" class="text-blue-600 font-medium">
                Assigned to: {{ getDeviceUnit(device.scanResult.device.deviceId) }}
              </p>
              <p class="text-sm text-gray-500 italic">
                Last seen: {{ Math.floor((reactiveTime - device.lastSeen) / 1000) }}s ago
              </p>
            </ion-label>

            <!-- Unit Assignment Dropdown -->
            <ion-select slot="end" :value="getDeviceUnit(device.scanResult.device.deviceId)"
              @ionChange="assignDevice(device.scanResult.device.deviceId, $event.detail.value)"
              placeholder="Assign Unit" interface="popover">
              <ion-select-option :value="null">Unassigned</ion-select-option>
              <ion-select-option v-for="unitType in unitTypes" :key="unitType" :value="unitType">
                {{ UNIT_CONFIGS[unitType].name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <ion-text v-else-if="!isScanning" color="medium">
          <p>No devices found. Start scanning to discover BLE devices.</p>
        </ion-text>

        <div v-if="isScanning" class="flex justify-center py-5">
          <ion-spinner name="circles"></ion-spinner>
        </div>

        <ion-text color="danger" v-if="bleErrorMsg">
          {{ bleErrorMsg }}
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
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
  IonText,
  IonSelect,
  IonSelectOption,
  IonAccordionGroup,
  IonAccordion
} from '@ionic/vue';

// Import BLE state and functions directly from sensor module
import {
  isScanning,
  devices,
  bleErrorMsg,
  restartBLEScan,
  clearBLEDevices,
} from '@/sensors/blesensors'

// Import device mapping functionality
import { useDeviceMapping, unitTypes } from '@/composables/useDeviceMapping';
import { UNIT_CONFIGS, type UnitType } from '@/types/units';

const { assignDeviceToUnit, getDeviceUnit, exportMappings } = useDeviceMapping();

// Reactive timestamp for "last seen" display (updates every 5s)
const reactiveTime = ref(Date.now());
let reactiveTimer: number | undefined;

onMounted(() => {
  reactiveTimer = window.setInterval(() => {
    reactiveTime.value = Date.now();
  }, 5000);
});

onUnmounted(() => {
  if (reactiveTimer !== undefined) clearInterval(reactiveTimer);
  console.log('Tab2Page unmounted - BLE continues running globally');
});

const assignDevice = (deviceId: string, unitType: UnitType | null) => {
  assignDeviceToUnit(deviceId, unitType);
};

// sort devices by priority
const sortedDevices = computed(() => {
  // const now = Date.now();
  // const maxAge = 300 * 1000; // 5 mins

  return Array.from(devices.value.values())
    // .filter(device => (now - device.lastSeen) <= maxAge)
    .sort((a, b) => {
      // Primary sort: by sortingPriority (lower numbers first)
      const priorityA = a.decoded.sortingPriority ?? 999;
      const priorityB = b.decoded.sortingPriority ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort: by type name if priorities are equal
      const typeA = a.decoded.type || 'Unknown';
      const typeB = b.decoded.type || 'Unknown';
      return typeA.localeCompare(typeB);
    });
});
</script>

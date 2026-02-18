<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title class="[&.ios]:static [&.ios]:text-left [&.ios]:pl-4 [&.ios]:pb-2 [&.md]:pl-4">BLE Scanner</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="solid" color="primary" @click="clearBLEDevices">
            Clear
          </ion-button>
          <ion-button fill="solid" color="primary" @click="restartBLEScan">
            Restart
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="p-2 flex flex-col gap-1">
        <ion-list v-if="sortedDevices.length > 0">
          <div v-for="device in sortedDevices" :key="device.scanResult.device.deviceId"
            class="grid grid-cols-2 gap-1 py-1 px-2 border-b border-gray-200 last:border-b-0">
            <!-- Left column: sensor info -->
            <div>
              <p class="text-base font-semibold">{{ device.scanResult.device.name || 'Unnamed Device' }}</p>
              <p class="text-sm text-gray-600">ID: {{ device.scanResult.device.deviceId }}</p>
              <p class="text-sm text-gray-600">RSSI: {{ device.scanResult.rssi }} dBm</p>
              <p v-if="device.decoded.type" class="text-sm text-gray-600">
                Type: {{ device.decoded.type }}
              </p>
              <p class="text-sm text-gray-500 italic">
                Last seen: {{ Math.floor((reactiveTime - device.lastSeen) / 1000) }}s ago
              </p>
            </div>

            <!-- Right column: unit assignment (top) + sensor data (bottom) -->
            <div class="flex flex-col gap-2">
              <div class="flex-1 flex items-center justify-end">
                <ion-select :value="getDeviceUnit(device.scanResult.device.deviceId)"
                  @ionChange="assignDevice(device.scanResult.device.deviceId, $event.detail.value)"
                  placeholder="Assign Unit" interface="popover" class="text-lg font-bold">
                  <ion-select-option :value="null">Unassigned</ion-select-option>
                  <ion-select-option v-for="unitType in unitTypes" :key="unitType" :value="unitType">
                    {{ UNIT_CONFIGS[unitType].name }}
                  </ion-select-option>
                </ion-select>
              </div>
              <div class="flex-1 flex items-center justify-center" v-if="device.decoded.value">
                <ion-accordion-group>
                  <ion-accordion>
                    <ion-item slot="header">
                      <ion-label class="text-sm">{{ Object.keys(device.decoded.value).length }} metrics</ion-label>
                    </ion-item>
                    <div slot="content" class="p-2">
                      <div v-for="(value, key) in device.decoded.value" :key="key"
                        class="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                        <span class="text-sm text-gray-500 font-medium">{{ key }}:</span>
                        <span class="text-sm font-semibold text-gray-900 tabular-nums">{{ value }}</span>
                      </div>
                    </div>
                  </ion-accordion>
                </ion-accordion-group>
              </div>
            </div>
          </div>
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

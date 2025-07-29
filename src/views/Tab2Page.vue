<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>BLE Scanner</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-button class="basis-1/4" @click="exportMappings">
        Export
      </ion-button>
      <ion-button class="basis-1/4" @click="clearBLEDevices">
        Clear
      </ion-button>

      <ion-button class="basis-1/4" @click="restartBLEScan">
        Restart
      </ion-button>
      <div class="ble-container">
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
                  <div slot="content" class="sensor-details">
                    <div v-for="(value, key) in device.decoded.value" :key="key" class="data-row">
                      <span class="data-label">{{ key }}:</span>
                      <span class="data-value">{{ value }}</span>
                    </div>
                  </div>
                </ion-accordion>
              </ion-accordion-group>

              <p v-if="getDeviceUnit(device.scanResult.device.deviceId)" class="assignment">
                Assigned to: {{ getDeviceUnit(device.scanResult.device.deviceId) }}
              </p>
              <p class="last-seen">
                Last seen: {{ Math.floor((Date.now() - device.lastSeen) / 1000) }}s ago
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

        <ion-spinner v-if="isScanning" name="circles"></ion-spinner>

        <ion-text color="danger" v-if="bleErrorMsg">
          {{ bleErrorMsg }}
        </ion-text>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onUnmounted, computed } from 'vue';
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

// Import BLE state and functions from centralized module
import {
  isScanning,
  devices,
  bleErrorMsg,
  restartBLEScan,
  clearBLEDevices,
} from '@/utils/state';

// Import device mapping functionality
import { useDeviceMapping, unitTypes } from '@/composables/useDeviceMapping';
import { UNIT_CONFIGS, type UnitType } from '@/types/units';

const { assignDeviceToUnit, getDeviceUnit, exportMappings } = useDeviceMapping();

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

// Clean up when component unmounts
onUnmounted(async () => {
  // Note: We don't cleanup BLE here since it's managed globally
  // The scanning will continue in the background for other parts of the app
  console.log('Tab2Page unmounted - BLE continues running globally');
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

.last-seen {
  font-size: 0.9em;
  color: var(--ion-color-medium);
  font-style: italic;
}

.assignment {
  color: var(--ion-color-primary);
  font-weight: 500;
}


.data-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.data-row:last-child {
  border-bottom: none;
}

.data-label {
  font-size: 0.9em;
  color: var(--ion-color-medium);
  font-weight: 500;
  /* text-transform: capitalize; */
}

.data-value {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--ion-color-dark);
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}
</style>

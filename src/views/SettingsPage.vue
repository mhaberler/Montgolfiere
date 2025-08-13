<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-accordion-group v-model="openAccordion">
        <ion-accordion value="config">
          <ion-item slot="header">
            <ion-label>Configuration</ion-label>
          </ion-item>
          <div slot="content">
            <div class="grid grid-cols-2 gap-1 p-4">
              <div>
                <ion-label>Transition alt (ft)</ion-label>
              </div>
              <div>
                <ion-input
                  type="number"
                  min="0"
                  max="12000"
                  step="1000"
                  v-model.number="transitionAltitude"
                ></ion-input>
              </div>
              <div>
                <ion-label>Variance samples</ion-label>
              </div>
              <div>
                <ion-input
                  type="number"
                  min="5"
                  max="100"
                  v-model.number="historySamples"
                  @ionBlur="
                    () => {
                      if (historySamples < 5) historySamples = 5
                      if (historySamples > 500) historySamples = 500
                    }
                  "
                ></ion-input>
              </div>

              <div v-if="isAndroid">
                <ion-label>Decimate EKF samples</ion-label>
              </div>
              <div v-if="isAndroid">
                <ion-select v-model="decimateEKFSamples" interface="popover">
                  <ion-select-option value="1">1</ion-select-option>
                  <ion-select-option value="2">2</ion-select-option>
                  <ion-select-option value="3">3</ion-select-option>
                  <ion-select-option value="4">4</ion-select-option>
                  <ion-select-option value="5">5</ion-select-option>
                  <ion-select-option value="10">10</ion-select-option>
                </ion-select>
              </div>

              <div class="mt-4 space-y-2 p-4">
                <label for="pmtiles-url" class="block text-sm font-medium"
                  >Digital Elevation Model:</label
                >
                <select
                  v-model="selectedUrl"
                  class="w-full rounded-md border border-gray-300 p-2"
                  @change="updateDemUrl"
                >
                  <option value="https://static.mah.priv.at/cors/dem/eudem_dem_4258_europe.pmtiles">
                    Europe 30m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Austria_10m_v2_by_Sonny.pmtiles"
                  >
                    Austria 10m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Slovenia_20m_v1_by_Sonny.pmtiles"
                  >
                    Slovenia 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Germany_20m_v3b_by_Sonny.pmtiles"
                  >
                    Germany 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Italy_20m_v2b_by_Sonny.pmtiles"
                  >
                    Italy 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Switzerland_10m_v2_by_Sonny.pmtiles"
                  >
                    Switzerland 10m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Sweden_20m_v2_by_Sonny.pmtiles"
                  >
                    Sweden 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Croatia_20m_v1_by_Sonny.pmtiles"
                  >
                    Croatia 10m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Hungary_20m_v1_by_Sonny.pmtiles"
                  >
                    Hungary 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Slovakia_20m_v2_by_Sonny.pmtiles"
                  >
                    Slovakia 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Czechia_20m_v2_by_Sonny.pmtiles"
                  >
                    Czechia 20m
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/DTM_Poland_20m_v1_by_Sonny.pmtiles"
                  >
                    Poland 20m
                  </option>
                  <option value="custom">Custom URL...</option>
                </select>
                <input
                  v-if="selectedUrl === 'custom'"
                  v-model="customUrl"
                  class="w-full rounded-md border border-gray-300 p-2"
                  placeholder="Enter custom PMTiles URL"
                  @input="updateDemUrl"
                />
              </div>

              <div class="mt-4 p-4">
                <ion-button expand="block" color="warning" @click="clearAllPreferences">
                  Reset preferences to defaults
                </ion-button>
              </div>
            </div>
          </div>
        </ion-accordion>
        <ion-accordion value="airport-qnh">
          <ion-item slot="header">
            <ion-label>QNH setting</ion-label>
          </ion-item>
          <div slot="content">
            <div class="grid grid-cols-2 gap-1 p-4">
              <div>
                <ion-label>Auto</ion-label>
              </div>
              <div>
                <ion-checkbox v-model="autoQNHflag"></ion-checkbox>
              </div>

              <div>
                <ion-label :class="{ 'opacity-50': autoQNHflag }">manual QNH (hPa)</ion-label>
              </div>
              <div>
                <ion-input
                  type="number"
                  min="800"
                  max="1100"
                  step="1"
                  v-model.number="manualQNHvalue"
                  :disabled="autoQNHflag"
                  :class="{ 'opacity-50': autoQNHflag }"
                ></ion-input>
              </div>
            </div>

            <ion-card>
              <ion-card-content>
                <div v-if="airportQnhData.length > 0" class="space-y-2">
                  <div
                    v-for="airport in airportQnhData"
                    :key="airport.icao"
                    class="flex items-center justify-between"
                  >
                    <div>
                      <span class="font-semibold">{{ airport.site }}</span>
                      <span class="ml-2 text-xs text-gray-500">({{ airport.icao }})</span>
                      <span class="ml-2 text-xs text-gray-500">{{ airport.distance }} km</span>
                    </div>
                    <div>
                      <span class="font-mono">QNH: {{ airport.qnh }}</span>
                    </div>
                  </div>
                </div>
                <ion-button
                  class="mt-4"
                  expand="block"
                  @click="handleUpdateQnh"
                  :disabled="loadingQnh"
                >
                  {{ loadingQnh ? 'Updating...' : 'Update QNH from Location' }}
                </ion-button>
                <div v-if="qnhError" class="mt-2 text-red-500">{{ qnhError }}</div>
              </ion-card-content>
            </ion-card>
          </div>
        </ion-accordion>
        <ion-accordion value="debug">
          <ion-item slot="header">
            <ion-label>Debug</ion-label>
          </ion-item>
          <div slot="content">
            <DebugEkf />
          </div>
        </ion-accordion>
        <ion-accordion value="build-info">
          <ion-item slot="header">
            <ion-label>Build Information</ion-label>
          </ion-item>
          <div slot="content">
            <div class="space-y-2 p-4">
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="font-medium">App Version:</div>
                <div class="font-mono">{{ appVersion }}</div>

                <template v-if="gitTag">
                  <div class="font-medium">Git Tag:</div>
                  <div class="font-mono">{{ gitTag }}</div>
                </template>

                <div class="font-medium">Git SHA:</div>
                <div class="font-mono text-xs">
                  <a
                    :href="`https://github.com/mhaberler/Montgolfiere/commit/${gitSha}`"
                    target="_blank"
                    class="text-blue-600 underline hover:text-blue-800"
                  >
                    {{ gitSha }}
                  </a>
                </div>

                <div class="font-medium">Git Branch:</div>
                <div class="font-mono">{{ gitBranch }}</div>

                <div class="font-medium">Build Date:</div>
                <div class="font-mono text-xs">{{ buildDate }}</div>
              </div>
            </div>
          </div>
        </ion-accordion>
      </ion-accordion-group>

      <ion-card v-if="false">
        <ion-card-header>
          <ion-card-title>MQTT Broker Settings</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="config-grid">
            <div class="config-item">
              <ion-label>Broker URL</ion-label>
              <ion-input v-model="mqttBrokerUrl"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>User</ion-label>
              <ion-input v-model="mqttUser"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Password</ion-label>
              <ion-input type="password" v-model="mqttPassword"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Connection Status</ion-label>
              <!-- [color]="mqttStatusColor" -->
              <ion-text>{{ mqttStatusMsg }}</ion-text>
            </div>
            <div class="config-item">
              <ion-button expand="full" @click="checkMqttConnection"> Check Connection </ion-button>
            </div>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// Track which accordion is open
import { watch } from 'vue'
const openAccordion = ref('')
watch(openAccordion, (val) => {
  showDebugInfo.value = val === 'debug'
})

import {
  IonPage,
  IonContent,
  IonLabel,
  IonToggle,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonText,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCheckbox,
} from '@ionic/vue'
import { Preferences } from '@capacitor/preferences'

import DebugEkf from '@/components/DebugEkf.vue'
import { computed, ref } from 'vue'
import { airportQnhData, updateQnhFromLocation } from '@/process/qnh'
// import { mqttBrokerUrl, mqttUser, mqttPassword, mqttStatusMsg, checkMqttConnection } from '@/utils/mqtt';
import { mqttBrokerUrl, mqttUser, mqttPassword, mqttStatusMsg } from '@/utils/mqtt'
import { initializeMqtt } from '@/utils/mqttService'
import { decimateEKFSamples } from '@/process/pressure'
import { selectedDemUrl } from '@/composables/useDemUrl'

import { transitionAltitude, historySamples } from '@/utils/state'

import { manualQNHvalue, autoQNHflag } from '../process/qnh'
import { showDebugInfo } from '@/utils/startup'
// Add these imports
import { Capacitor } from '@capacitor/core'

// Add platform detection
const isAndroid = computed(() => Capacitor.getPlatform() === 'android')

// Build information constants
const gitSha = __GIT_COMMIT_HASH__ || 'N/A'
const gitBranch = __GIT_BRANCH_NAME__ || 'N/A'
const gitTag = __GIT_TAG__ || ''
const buildDate = __VITE_BUILD_DATE__ || 'N/A'
const appVersion = __APP_VERSION__ || 'N/A'

const clearAllPreferences = async () => {
  await Preferences.clear()
  console.log('All preferences cleared.')
}

interface MqttInitOptions {
  brokerUrl: string
  topics: string[]
  onMessageCallback: (topic: string, message: string | Buffer) => void
  onStatusChange: (status: string) => void
}

const checkMqttConnection = async (): Promise<void> => {
  console.log(`------------fooo`)
  await initializeMqtt({
    brokerUrl: 'wss://test.mosquitto.org:8081/mqtt',
    // mqttBrokerUrl.value,
    topics: ['location/updates', 'barometer/readings', 'ble/advertisements'],
    onMessageCallback: (topic: string, message: string | Buffer): void => {
      const data: unknown = JSON.parse(message.toString())
      // Process location, barometer, or BLE data here
      console.log(`Processed data from ${topic}:`, data)
    },
    onStatusChange: (status: string): void => {
      console.log(`MQTT status updated: ${status}`)
      // Update UI or app state based on status, e.g., show connection indicator
    },
  } as MqttInitOptions)
}

// const toggleDebugInfo = () => {
//   showDebugInfo.value = !showDebugInfo.value;
// };

// PMTiles URL management
const selectedUrl = selectedDemUrl
const customUrl = ref('')

const updateDemUrl = () => {
  if (selectedUrl.value === 'custom') {
    if (customUrl.value.trim()) {
      selectedUrl.value = customUrl.value.trim()
    }
  }
  // selectedUrl.value is automatically updated when dropdown changes
  // The watcher in location.ts will handle the DEM loading
}

// // Get sensor source options based on platform
// const sensorSourceOptions = computed(() => {
//   const options = [
//     { value: 'simulated', label: 'Simulated' },
//     // { value: 'mqtt', label: 'MQTT' },
//     // { value: 'logfile', label: 'Log file' }
//   ];

//   // Only add hardware option on native platforms
//   if (isNativePlatform.value) {
//     options.unshift({ value: 'native', label: 'Hardware' });
//   }

//   return options;
// });

// QNH update state
const loadingQnh = ref(false)
const qnhError = ref('')

const handleUpdateQnh = async () => {
  loadingQnh.value = true
  qnhError.value = ''
  try {
    await updateQnhFromLocation()
  } catch (err) {
    let msg = 'Failed to update QNH.'
    if (err && typeof err === 'object') {
      if ('message' in err && typeof (err as any).message === 'string') {
        msg = (err as any).message
      } else {
        msg = JSON.stringify(err)
      }
    } else if (typeof err === 'string') {
      msg = err
    }
    qnhError.value = msg
  } finally {
    loadingQnh.value = false
  }
}

import { onMounted } from 'vue'
onMounted(() => {
  // Optionally trigger initial QNH update on mount
  if (airportQnhData.value.length === 0) {
    handleUpdateQnh()
  }
})
</script>

<style scoped>
/* all tailwind */
</style>

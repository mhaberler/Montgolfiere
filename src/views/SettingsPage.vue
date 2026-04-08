<template>
  <div class="flex min-h-0 flex-1 flex-col bg-gray-50">
    <main class="flex-1 overflow-auto">
      <AppPageContent content-class="safe-bottom">
      <div class="space-y-3">
        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800"
            @click="toggleAccordion('config')"
          >
            <span>Configuration</span>
            <span class="text-gray-400">{{ openAccordion === 'config' ? '−' : '+' }}</span>
          </button>
          <div v-if="openAccordion === 'config'" class="border-t border-gray-100">
            <div class="grid grid-cols-2 gap-1 p-4">
              <div>
                <label class="text-sm font-medium text-gray-700">Transition alt (ft)</label>
              </div>
              <div>
                <input
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  type="number"
                  min="0"
                  max="12000"
                  step="1000"
                  v-model.number="transitionAltitude"
                />
              </div>
              <div>
                <label class="text-sm font-medium text-gray-700">Variance samples</label>
              </div>
              <div>
                <input
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  type="number"
                  min="5"
                  max="100"
                  v-model.number="historySamples"
                  @blur="
                    () => {
                      if (historySamples < 5) historySamples = 5;
                      if (historySamples > 500) historySamples = 500;
                    }
                  "
                />
              </div>

              <div v-if="isAndroid">
                <label class="text-sm font-medium text-gray-700">Decimate EKF samples</label>
              </div>
              <div v-if="isAndroid">
                <select
                  v-model.number="decimateEKFSamples"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option :value="1">1</option>
                  <option :value="2">2</option>
                  <option :value="3">3</option>
                  <option :value="4">4</option>
                  <option :value="5">5</option>
                  <option :value="10">10</option>
                </select>
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
                  <option
                    value="https://download.mapterhorn.com/planet.pmtiles"
                  >
                    Mapterhorn Global
                  </option>
                  <option
                    value="https://static.mah.priv.at/cors/dem/eudem_dem_4258_europe.pmtiles"
                  >
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
                <button class="btn btn-warning w-full text-sm" @click="clearAllPreferences">
                  Reset preferences to defaults
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800"
            @click="toggleAccordion('airport-qnh')"
          >
            <span>QNH setting</span>
            <span class="text-gray-400">{{ openAccordion === 'airport-qnh' ? '−' : '+' }}</span>
          </button>
          <div v-if="openAccordion === 'airport-qnh'" class="border-t border-gray-100">
            <div class="grid grid-cols-2 gap-1 p-4">
              <div>
                <label class="text-sm font-medium text-gray-700">Auto</label>
              </div>
              <div>
                <input v-model="autoQNHflag" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-sky-600" />
              </div>

              <div>
                <label class="text-sm font-medium text-gray-700" :class="{ 'opacity-50': autoQNHflag }"
                  >manual QNH (hPa)</label
                >
              </div>
              <div>
                <input
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  type="number"
                  min="800"
                  max="1100"
                  step="1"
                  v-model.number="manualQNHvalue"
                  :disabled="autoQNHflag"
                  :class="{ 'opacity-50': autoQNHflag }"
                />
              </div>
            </div>

            <div class="mx-4 mb-4 rounded-lg border border-gray-200 bg-white p-4">
                <div v-if="airportQnhData.length > 0" class="space-y-2">
                  <div
                    v-for="airport in airportQnhData"
                    :key="airport.icao"
                    class="flex items-center justify-between"
                  >
                    <div>
                      <span class="font-semibold">{{ airport.site }}</span>
                      <span class="ml-2 text-xs text-gray-500"
                        >({{ airport.icao }})</span
                      >
                      <span class="ml-2 text-xs text-gray-500"
                        >{{ airport.distance }} km</span
                      >
                    </div>
                    <div>
                      <span class="font-mono">QNH: {{ airport.qnh }}</span>
                    </div>
                  </div>
                </div>
                <button
                  class="btn btn-primary mt-4 w-full text-sm"
                  @click="handleUpdateQnh"
                  :disabled="loadingQnh"
                >
                  {{ loadingQnh ? "Updating..." : "Update QNH from Location" }}
                </button>
                <div v-if="qnhError" class="mt-2 text-red-500">
                  {{ qnhError }}
                </div>
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800"
            @click="toggleAccordion('debug')"
          >
            <span>Debug</span>
            <span class="text-gray-400">{{ openAccordion === 'debug' ? '−' : '+' }}</span>
          </button>
          <div v-if="openAccordion === 'debug'" class="border-t border-gray-100 p-4">
            <DebugEkf />
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800"
            @click="toggleAccordion('mqtt')"
          >
            <span>MQTT</span>
            <span class="text-gray-400">{{ openAccordion === 'mqtt' ? '−' : '+' }}</span>
          </button>
          <div v-if="openAccordion === 'mqtt'" class="border-t border-gray-100 p-4">
            <ScannerView />
          </div>
        </section>

        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800"
            @click="toggleAccordion('build-info')"
          >
            <span>Build Information</span>
            <span class="text-gray-400">{{ openAccordion === 'build-info' ? '−' : '+' }}</span>
          </button>
          <div v-if="openAccordion === 'build-info'" class="border-t border-gray-100">
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
        </section>

      <div v-if="false" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="mb-3 text-base font-semibold text-gray-800">MQTT Broker Settings</div>
          <div class="config-grid">
            <div class="config-item">
              <label class="text-sm font-medium text-gray-700">Broker URL</label>
              <input v-model="mqttBrokerUrl" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="config-item">
              <label class="text-sm font-medium text-gray-700">User</label>
              <input v-model="mqttUser" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="config-item">
              <label class="text-sm font-medium text-gray-700">Password</label>
              <input type="password" v-model="mqttPassword" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="config-item">
              <label class="text-sm font-medium text-gray-700">Connection Status</label>
              <div>{{ mqttStatusMsg }}</div>
            </div>
            <div class="config-item">
              <button class="btn btn-primary w-full text-sm" @click="checkMqttConnection">
                Check Connection
              </button>
            </div>
          </div>
      </div>
      </div>
      </AppPageContent>
    </main>
  </div>
</template>

<script setup lang="ts">
import { watch, computed, ref, onMounted } from "vue";
import AppPageContent from "@/components/layout/AppPageContent.vue";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

import DebugEkf from "@/components/DebugEkf.vue";
import ScannerView from "@/components/ScannerView.vue";
import { useAppLifecycle } from "@/composables/useAppLifecycle";
import { airportQnhData, updateQnhFromLocation } from "@/process/qnh";
import {
  mqttBrokerUrl,
  mqttUser,
  mqttPassword,
  mqttStatusMsg,
} from "@/utils/mqtt";
import { initializeMqtt } from "@/utils/mqttService";
import {
  decimateEKFSamples,
  transitionAltitude,
  historySamples,
  showDebugInfo,
  manualQNHvalue,
  autoQNHflag,
} from "@/composables/useAppState";
import { selectedDemUrl } from "@/composables/useDemUrl";

// Track which accordion is open
const openAccordion = ref("");
watch(openAccordion, (val) => {
  showDebugInfo.value = val === "debug";
});

const toggleAccordion = (value: string) => {
  openAccordion.value = openAccordion.value === value ? "" : value;
};

const isAndroid = computed(() => Capacitor.getPlatform() === "android");

// Build information constants
const gitSha = __GIT_COMMIT_HASH__ || "N/A";
const gitBranch = __GIT_BRANCH_NAME__ || "N/A";
const gitTag = __GIT_TAG__ || "";
const buildDate = __VITE_BUILD_DATE__ || "N/A";
const appVersion = __APP_VERSION__ || "N/A";

const clearAllPreferences = async () => {
  await Preferences.clear();
  console.log("All preferences cleared.");
};

interface MqttInitOptions {
  brokerUrl: string;
  topics: string[];
  onMessageCallback: (topic: string, message: string | Buffer) => void;
  onStatusChange: (status: string) => void;
}

const checkMqttConnection = async (): Promise<void> => {
  console.log(`------------fooo`);
  await initializeMqtt({
    brokerUrl: "wss://test.mosquitto.org:8081/mqtt",
    // mqttBrokerUrl.value,
    topics: ["location/updates", "barometer/readings", "ble/advertisements"],
    onMessageCallback: (topic: string, message: string | Buffer): void => {
      const data: unknown = JSON.parse(message.toString());
      // Process location, barometer, or BLE data here
      console.log(`Processed data from ${topic}:`, data);
    },
    onStatusChange: (status: string): void => {
      console.log(`MQTT status updated: ${status}`);
      // Update UI or app state based on status, e.g., show connection indicator
    },
  } as MqttInitOptions);
};

// const toggleDebugInfo = () => {
//   showDebugInfo.value = !showDebugInfo.value;
// };

// PMTiles URL management
const selectedUrl = selectedDemUrl;
const customUrl = ref("");

const updateDemUrl = () => {
  if (selectedUrl.value === "custom") {
    if (customUrl.value.trim()) {
      selectedUrl.value = customUrl.value.trim();
    }
  }
  // selectedUrl.value is automatically updated when dropdown changes
  // The watcher in location.ts will handle the DEM loading
};

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
const loadingQnh = ref(false);
const qnhError = ref("");

const handleUpdateQnh = async () => {
  loadingQnh.value = true;
  qnhError.value = "";
  try {
    await updateQnhFromLocation();
  } catch (err) {
    let msg = "Failed to update QNH.";
    if (err && typeof err === "object") {
      if ("message" in err && typeof (err as any).message === "string") {
        msg = (err as any).message;
      } else {
        msg = JSON.stringify(err);
      }
    } else if (typeof err === "string") {
      msg = err;
    }
    qnhError.value = msg;
  } finally {
    loadingQnh.value = false;
  }
};

onMounted(() => {
  // Optionally trigger initial QNH update on mount
  if (airportQnhData.value.length === 0) {
    handleUpdateQnh();
  }
});

// Blur focused element when page hides (accessibility)
const { isActive } = useAppLifecycle();
watch(isActive, (active) => {
  if (!active) {
    (document.activeElement as HTMLElement)?.blur();
  }
});
</script>

<style scoped>
/* all tailwind */
</style>

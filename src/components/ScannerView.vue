<template>
  <div class="min-h-screen w-full bg-gray-50 p-3 md:p-6">
    <!-- Header row: title + scan button -->
    <div class="mb-3 flex items-center justify-between">
      <!-- <h1 class="text-lg font-bold text-gray-800">Broker Configuration</h1> -->
      <div class="flex items-center gap-2">
        <button
          v-if="isCapacitorApp"
          @click="restartScan"
          :class="[
            'btn px-3 py-1.5 text-sm',
            isScanning ? 'btn-danger' : 'btn-success',
          ]"
        >
          {{ isScanning ? "Scanning…" : "Discover" }}
        </button>
        <span
          v-if="!isCapacitorApp"
          class="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] text-amber-600"
        >
          mDNS: native only
        </span>
      </div>
    </div>

    <!-- Preferred broker card -->
    <div
      v-if="preferredBroker"
      class="mb-3 rounded-xl border-2 p-3 shadow-sm"
      :class="preferredCardClasses"
    >
      <div class="flex items-start gap-3">
        <!-- Connection state indicator -->
        <div class="mt-0.5 flex-shrink-0">
          <div :class="['h-4 w-4 rounded-full', stateIndicatorClass]"></div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-bold break-words text-gray-800">{{
              preferredBroker.name
            }}</span>
            <!-- Source badge -->
            <span
              :class="[
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
                sourceBadgeClass,
              ]"
            >
              {{ sourceBadgeLabel }}
            </span>
            <!-- Tested badge -->
            <span
              v-if="preferredBroker.tested"
              class="bg-success inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            >
              &#10003; Tested
            </span>
          </div>
          <div
            class="mt-1 flex items-center gap-2 font-mono text-xs text-gray-500"
          >
            <span>{{ preferredBroker.host }}:{{ preferredBroker.port }}</span>
            <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">{{
              friendlyType(preferredBroker.type)
            }}</span>
          </div>
          <!-- Credential fields (shown for discovered/manual when WSS or user wants) -->
          <div v-if="showCredentials" class="mt-2 flex flex-wrap gap-2">
            <input
              v-model="preferredBroker.username"
              placeholder="Username"
              class="focus:ring-primary min-w-[100px] flex-1 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:ring-1"
            />
            <input
              v-model="preferredBroker.password"
              placeholder="Password"
              type="password"
              class="focus:ring-primary min-w-[100px] flex-1 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:ring-1"
            />
          </div>
          <!-- TLS toggle -->
          <label
            v-if="isWssType(preferredBroker.type)"
            class="mt-2 flex items-center gap-2"
          >
            <input
              type="checkbox"
              v-model="preferredBroker.rejectUnauthorized"
              class="text-primary focus:ring-primary h-3.5 w-3.5 rounded border-gray-300"
            />
            <span class="text-xs text-gray-600">Verify TLS certificate</span>
          </label>
        </div>
      </div>
      <!-- Action buttons row -->
      <div class="mt-3 flex gap-2">
        <button
          @click="runInlineTest"
          :disabled="isTesting"
          class="btn btn-warning flex-1 px-3 py-1.5 text-xs"
        >
          {{ isTesting ? `Testing (${testTimeRemaining}s)` : "Test" }}
        </button>
        <label class="flex cursor-pointer items-center gap-1.5 select-none">
          <input
            type="checkbox"
            :checked="preferredBroker.autoConnect"
            @change="toggleAutoConnect"
            class="text-primary focus:ring-primary h-3.5 w-3.5 rounded border-gray-300"
          />
          <span class="text-xs text-gray-600">Auto-connect</span>
        </label>
        <button
          @click="clearPreferredBroker"
          class="btn border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
        >
          Clear
        </button>
      </div>
      <!-- Inline test result -->
      <div
        v-if="testResult !== null"
        class="mt-2 rounded px-2 py-1 text-xs font-semibold"
        :class="
          testResult ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        "
      >
        {{
          testResult
            ? "Test passed — broker is reachable"
            : "Test failed — check host, port, and credentials"
        }}
      </div>
    </div>

    <!-- Error display -->
    <div
      v-if="scanError"
      class="mb-3 rounded-lg border border-red-100 bg-red-50 p-2 text-xs text-red-700"
    >
      {{ scanError }}
    </div>

    <!-- Broker list -->
    <div class="space-y-1">
      <!-- Pre-configured brokers -->
      <div v-if="preconfiguredList.length > 0">
        <div
          class="mb-1 px-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase"
        >
          Pre-configured
        </div>
        <div
          v-for="entry in preconfiguredList"
          :key="entry.key"
          class="rounded border bg-white px-3 py-2 transition-all"
          :class="
            isPreferred(entry.service)
              ? 'border-2 border-amber-300 shadow-md'
              : 'border-gray-200 hover:border-blue-200'
          "
          style="
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
          "
        >
          <div style="min-width: 0">
            <span class="truncate text-sm font-semibold text-gray-800">{{
              entry.service.name
            }}</span>
            <span class="font-mono text-[10px] text-gray-400"
              >{{ entry.service.host }}:{{ entry.service.port }}</span
            >
          </div>
          <div class="flex flex-shrink-0 items-center gap-1">
            <button
              @click="navigateToClient(entry.service)"
              class="text-primary flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Open client"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
            <button
              v-if="!isPreferred(entry.service)"
              @click="setPreferred(entry.service)"
              class="text-warning flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Set preferred"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            <span
              v-else
              class="flex h-8 w-8 items-center justify-center rounded-full text-amber-500"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <!-- Discovered brokers -->
      <div v-if="discoveredList.length > 0">
        <div
          class="mt-2 mb-1 px-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase"
        >
          Discovered
        </div>
        <div
          v-for="entry in discoveredList"
          :key="entry.key"
          class="rounded border bg-white px-3 py-2 transition-all"
          :class="
            isPreferred(entry.service)
              ? 'border-2 border-amber-300 shadow-md'
              : 'border-gray-200 hover:border-blue-200'
          "
          style="
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
          "
        >
          <div style="min-width: 0">
            <div class="flex items-center gap-2">
              <span
                class="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                :class="
                  entry.service.resolved
                    ? 'bg-success'
                    : 'bg-warning animate-pulse'
                "
              ></span>
              <span class="truncate text-sm font-semibold text-gray-800">{{
                entry.service.name
              }}</span>
            </div>
            <span class="font-mono text-[10px] text-gray-400"
              >{{ entry.service.host }}:{{ entry.service.port }}</span
            >
          </div>
          <div class="flex flex-shrink-0 items-center gap-1">
            <button
              @click="navigateToClient(entry.service)"
              class="text-primary flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Open client"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
            <button
              v-if="!isPreferred(entry.service)"
              @click="setPreferred(entry.service)"
              class="text-warning flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Set preferred"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            <span
              v-else
              class="flex h-8 w-8 items-center justify-center rounded-full text-amber-500"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>

      <!-- Manual broker section -->
      <div>
        <div
          class="mt-2 mb-1 px-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase"
        >
          Manual
        </div>
        <!-- Existing manual broker (if any) -->
        <div
          v-if="manualEntry"
          class="rounded border bg-white px-3 py-2 transition-all"
          :class="
            isPreferred(manualEntry)
              ? 'border-2 border-amber-300 shadow-md'
              : 'border-gray-200 hover:border-blue-200'
          "
          style="
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
          "
        >
          <div style="min-width: 0">
            <span class="truncate text-sm font-semibold text-gray-800">{{
              manualEntry.name
            }}</span>
            <span class="font-mono text-[10px] text-gray-400"
              >{{ manualEntry.host }}:{{ manualEntry.port }}</span
            >
          </div>
          <div class="flex flex-shrink-0 items-center gap-1">
            <button
              @click="navigateToClient(manualEntry)"
              class="text-primary flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Open client"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
            <button
              v-if="!isPreferred(manualEntry)"
              @click="setPreferred(manualEntry)"
              class="text-warning flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Set preferred"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            <span
              v-else
              class="flex h-8 w-8 items-center justify-center rounded-full text-amber-500"
            >
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            </span>
            <button
              @click="removeManualEntry"
              class="flex h-8 w-8 items-center justify-center rounded-full text-red-400 transition-colors hover:bg-gray-100 hover:text-red-600"
              title="Remove"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <!-- Manual entry form -->
        <div class="mt-1 rounded-lg border border-gray-100 bg-white p-2">
          <div class="flex flex-wrap gap-2">
            <input
              v-model="manualHost"
              placeholder="Host / IP"
              class="focus:ring-primary min-w-[120px] flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-1"
            />
            <input
              v-model="manualPort"
              placeholder="Port"
              type="number"
              class="focus:ring-primary w-20 rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-1"
            />
            <select
              v-model="selectedType"
              class="focus:ring-primary rounded border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-1"
            >
              <option value="_mqtt-ws._tcp.">WS</option>
              <option value="_mqtt-wss._tcp.">WSS</option>
            </select>
            <label
              v-if="selectedType === '_mqtt-wss._tcp.'"
              class="flex items-center gap-1.5"
            >
              <input
                type="checkbox"
                v-model="manualRejectUnauthorized"
                class="text-primary h-3.5 w-3.5 rounded border-gray-300"
              />
              <span class="text-xs text-gray-600">Verify TLS</span>
            </label>
            <button
              @click="addManualService"
              class="btn btn-primary px-3 py-1.5 text-sm"
            >
              {{ manualEntry ? "Replace" : "Add" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="Object.keys(services).length === 0 && !manualEntry"
        class="py-8 text-center text-sm text-gray-400"
      >
        <p>No brokers available. Discover via mDNS or add one manually.</p>
        <p class="mt-1 text-xs italic">Common ports: 8883 (MQTT-WS)</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { Capacitor } from "@capacitor/core";
import {
  useAppState,
  type ServiceEntry,
  type BrokerSource,
} from "../composables/useAppState";
import { useMqttConnection } from "../composables/useMqttConnection";
import { useMdnsScan } from "../composables/useMdnsScan";
import { useAppLifecycle } from "../composables/useAppLifecycle";

export default defineComponent({
  name: "ScannerView",
  setup() {
    const router = useRouter();
    const services = ref<Record<string, ServiceEntry>>({});
    const manualHost = ref<string>("");
    const manualPort = ref<number>(
      import.meta.env.VITE_MQTT_BROKER_PORT || 8883,
    );
    const selectedType = ref<string>("_mqtt-ws._tcp.");
    const manualRejectUnauthorized = ref<boolean>(true);
    const isCapacitorApp = ref<boolean>(Capacitor.isNativePlatform());
    const scanError = ref<string>("");

    // Inline test state
    const isTesting = ref<boolean>(false);
    const testResult = ref<boolean | null>(null);
    const testTimeRemaining = ref<number>(0);
    let testTimer: ReturnType<typeof setInterval> | null = null;

    // Shared state
    const { preferredBroker } = useAppState();
    const mqttConn = useMqttConnection();
    const {
      services: discoveredServices,
      isScanning,
      restartScan,
    } = useMdnsScan();

    // --- Pre-configured brokers ---
    const defaultServices: Record<string, ServiceEntry> = {
      localAP: {
        name: "localAP (MQTT-WS)",
        type: "_mqtt-ws._tcp.",
        host: "192.168.4.1",
        port: 8883,
        discovered: false,
        resolved: true,
        source: "preconfigured",
      },

      // "test-mosquitto-wss": {
      //   name: "test.mosquitto.org (WSS)",
      //   type: "_mqtt-wss._tcp.",
      //   host: "test.mosquitto.org",
      //   port: 8081,
      //   discovered: false,
      //   resolved: true,
      //   source: "preconfigured",
      // },
    };

    // if (isCapacitorApp.value) {
    //   defaultServices["test-mosquitto-ws"] = {
    //     name: "test.mosquitto.org (WS)",
    //     type: "_mqtt-ws._tcp.",
    //     host: "test.mosquitto.org",
    //     port: 8080,
    //     discovered: false,
    //     resolved: true,
    //     source: "preconfigured",
    //   };
    // }

    services.value = { ...defaultServices };

    // --- Computed lists by source ---
    const preconfiguredList = computed(() =>
      Object.entries(services.value)
        .filter(
          ([, s]) =>
            s.source === "preconfigured" || (!s.source && !s.discovered),
        )
        .map(([key, service]) => ({ key, service })),
    );

    const discoveredList = computed(() =>
      Object.entries(discoveredServices.value).map(([key, service]) => ({
        key,
        service,
      })),
    );

    // Single manual entry (keyed as 'manual')
    const MANUAL_KEY = "manual";
    const manualEntry = computed<ServiceEntry | null>(
      () => services.value[MANUAL_KEY] ?? null,
    );

    // --- Helpers ---
    function friendlyType(type: string): string {
      if (type.includes("wss")) return "WSS";
      if (type.includes("ws")) return "WS";
      if (type.includes("mqtts")) return "MQTTS";
      return "MQTT";
    }

    function isWssType(type: string): boolean {
      return type.includes("wss") || type.includes("mqtts");
    }

    function isPreferred(service: ServiceEntry): boolean {
      if (!preferredBroker.value) return false;
      return (
        preferredBroker.value.name === service.name &&
        preferredBroker.value.port === service.port
      );
    }

    function sourceOf(service: ServiceEntry): BrokerSource {
      if (service.source) return service.source;
      if (service.discovered) return "discovered";
      return "preconfigured";
    }

    // Show credentials for discovered/manual preferred brokers (may need username/password)
    const showCredentials = computed(() => {
      if (!preferredBroker.value) return false;
      const src = sourceOf(preferredBroker.value);
      return src === "discovered" || src === "manual";
    });

    // Source badge styling
    const sourceBadgeClass = computed(() => {
      if (!preferredBroker.value) return "bg-gray-400";
      const src = sourceOf(preferredBroker.value);
      if (src === "preconfigured") return "bg-primary";
      if (src === "discovered") return "bg-success";
      return "bg-warning";
    });

    const sourceBadgeLabel = computed(() => {
      if (!preferredBroker.value) return "";
      const src = sourceOf(preferredBroker.value);
      if (src === "preconfigured") return "Pre-configured";
      if (src === "discovered") return "Discovered";
      return "Manual";
    });

    // Connection state indicator for preferred broker
    const stateIndicatorClass = computed(() => {
      const state = mqttConn.connectionState.value;
      // Only show connection state if the connected broker matches preferred
      if (
        mqttConn.connectedBroker.value &&
        preferredBroker.value &&
        mqttConn.connectedBroker.value.host === preferredBroker.value.host &&
        mqttConn.connectedBroker.value.port === preferredBroker.value.port
      ) {
        if (state === "connected")
          return "bg-success shadow-[0_0_6px_rgba(76,175,80,0.6)]";
        if (state === "trying") return "bg-warning animate-pulse";
      }
      return "bg-gray-300";
    });

    // Preferred broker card border styling
    const preferredCardClasses = computed(() => {
      const state = mqttConn.connectionState.value;
      const isConnectedBroker =
        mqttConn.connectedBroker.value &&
        preferredBroker.value &&
        mqttConn.connectedBroker.value.host === preferredBroker.value.host &&
        mqttConn.connectedBroker.value.port === preferredBroker.value.port;

      if (isConnectedBroker && state === "connected") {
        return "border-success bg-green-50/50";
      }
      if (isConnectedBroker && state === "trying") {
        return "border-warning bg-amber-50/50";
      }
      return "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50";
    });

    // --- Manual broker: single entry, silent replace ---
    const addManualService = () => {
      if (manualHost.value && manualPort.value) {
        const entry: ServiceEntry = {
          name: `${manualHost.value}:${manualPort.value}`,
          type: selectedType.value,
          host: manualHost.value,
          port: parseInt(String(manualPort.value)),
          discovered: false,
          resolved: true,
          source: "manual",
          rejectUnauthorized: manualRejectUnauthorized.value,
        };
        services.value[MANUAL_KEY] = entry;
        // Also set as preferred broker (reset tested state)
        preferredBroker.value = { ...entry, tested: false, autoConnect: false };
        testResult.value = null;
        manualHost.value = "";
        manualPort.value = import.meta.env.VITE_MQTT_BROKER_PORT || 8883;
      }
    };

    const removeManualEntry = () => {
      // If the manual entry is preferred, clear preferred too
      if (manualEntry.value && isPreferred(manualEntry.value)) {
        preferredBroker.value = null;
      }
      delete services.value[MANUAL_KEY];
    };

    // --- Navigation ---
    const navigateToClient = (service: ServiceEntry) => {
      // Connect in background via shared composable
      mqttConn.connect(service);
      router.push({
        name: "MQTTClient",
        query: {
          name: service.name,
          type: service.type,
          host: service.host,
          port: String(service.port),
          discovered: service.discovered ? "true" : "false",
          txtRecord: service.txtRecord
            ? JSON.stringify(service.txtRecord)
            : undefined,
        },
      });
    };

    // --- Inline test ---
    const runInlineTest = async () => {
      if (!preferredBroker.value || isTesting.value) return;
      isTesting.value = true;
      testResult.value = null;
      testTimeRemaining.value = 15;

      if (testTimer) clearInterval(testTimer);
      testTimer = setInterval(() => {
        testTimeRemaining.value -= 1;
        if (testTimeRemaining.value <= 0 && testTimer) {
          clearInterval(testTimer);
          testTimer = null;
        }
      }, 1000);

      const success = await mqttConn.testConnect(preferredBroker.value);
      if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
      }
      testResult.value = success;
      testTimeRemaining.value = 0;

      if (success && preferredBroker.value) {
        preferredBroker.value = { ...preferredBroker.value, tested: true };
      }

      isTesting.value = false;
    };

    // --- Preferred broker ---
    const setPreferred = (service: ServiceEntry) => {
      // Reset tested when switching to a different broker
      preferredBroker.value = { ...service, tested: false, autoConnect: false };
      testResult.value = null;
    };

    const clearPreferredBroker = () => {
      preferredBroker.value = null;
      testResult.value = null;
    };

    const toggleAutoConnect = () => {
      if (!preferredBroker.value) return;
      preferredBroker.value = {
        ...preferredBroker.value,
        autoConnect: !preferredBroker.value.autoConnect,
      };
      console.log(
        "preferredBroker:",
        JSON.parse(JSON.stringify(preferredBroker.value)),
      );
    };

    // Cleanup on unmount
    onUnmounted(() => {
      if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
      }
    });

    // Blur focused element when page goes to background
    const { isActive } = useAppLifecycle();
    watch(isActive, (active: boolean) => {
      if (!active) {
        (document.activeElement as HTMLElement)?.blur();
      }
    });

    return {
      services,
      manualHost,
      manualPort,
      selectedType,
      isScanning,
      isCapacitorApp,
      scanError,
      preferredBroker,
      isTesting,
      testResult,
      testTimeRemaining,
      preconfiguredList,
      discoveredList,
      manualEntry,
      showCredentials,
      sourceBadgeClass,
      sourceBadgeLabel,
      stateIndicatorClass,
      preferredCardClasses,
      friendlyType,
      isWssType,
      isPreferred,
      addManualService,
      removeManualEntry,
      navigateToClient,
      runInlineTest,
      manualRejectUnauthorized,
      restartScan,
      setPreferred,
      clearPreferredBroker,
      toggleAutoConnect,
    };
  },
});
</script>

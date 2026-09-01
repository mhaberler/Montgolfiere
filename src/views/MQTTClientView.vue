<template>
  <div class="flex min-h-0 flex-1 flex-col bg-gray-50">
    <main class="w-full flex-1 overflow-auto bg-gray-50">
      <AppPageContent content-class="safe-bottom w-full bg-gray-50">
        <!-- Header row: name + status dot + buttons -->
        <div class="mb-4 flex items-center justify-between">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <div
              :class="[
                'h-3 w-3 shrink-0 rounded-full',
                mqttConn.isTrying.value
                  ? 'bg-warning animate-pulse'
                  : mqttConn.isConnected.value
                    ? 'bg-success shadow-[0_0_6px_rgba(76,175,80,0.6)]'
                    : 'bg-error',
              ]"
            ></div>
            <div class="truncate text-sm font-bold text-gray-800 md:text-sm">
              {{ serviceName }}>
            </div>
          </div>
          <button
            :class="[
              'btn px-2.5 py-1.5 text-xs font-bold whitespace-nowrap md:px-3 md:text-sm',
              mqttConn.isConnected.value
                ? 'btn-danger'
                : mqttConn.isTrying.value
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'btn-primary',
            ]"
            @click="
              mqttConn.isConnected.value
                ? mqttConn.disconnect()
                : connectToBroker()
            "
            :disabled="mqttConn.isTrying.value"
          >
            {{
              mqttConn.isConnected.value
                ? "Disconnect"
                : mqttConn.isTrying.value
                  ? "Connecting"
                  : "Connect"
            }}
          </button>
        </div>

        <!-- Broker URL text-[9px] md:text-[10px]-->
        <p
          class="mb-1 px-2 font-mono text-sm break-all text-gray-500 md:text-sm"
        >
          {{ mqttConn.brokerUrl.value }}
        </p>

        <!-- Error display -->
        <div
          v-if="mqttConn.error.value"
          class="bg-error/10 border-error/20 mb-3 flex items-center justify-between rounded-lg border p-2"
        >
          <p class="text-error mr-2 flex-1 text-xs font-medium">
            {{ mqttConn.error.value }}
          </p>
          <button
            @click="mqttConn.error.value = null"
            class="text-error/40 hover:text-error flex h-6 w-6 shrink-0 items-center justify-center text-lg font-bold"
          >
            ×
          </button>
        </div>

        <!-- Loading indicator -->
        <div
          v-if="mqttConn.isTrying.value"
          class="mb-3 rounded-lg border border-gray-100 bg-white p-4 text-center"
        >
          <div
            class="border-primary mb-2 inline-block h-6 w-6 animate-spin rounded-full border-3 border-t-transparent"
          ></div>
          <p class="text-sm text-gray-500">Connecting…</p>
        </div>

        <!-- Publish section -->
        <div
          v-if="mqttConn.isConnected.value"
          class="mb-1 rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
        >
          <!-- <h3 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <span class="w-1.5 h-4 bg-primary rounded-sm"></span>
            Publish
          </h3> -->
          <div class="flex flex-col gap-2">
            <input
              v-model="publishTopic"
              placeholder="Topic"
              class="focus:ring-primary w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:ring-2"
            />
            <textarea
              v-model="publishMessage"
              placeholder="Payload"
              class="focus:ring-primary w-full resize-none rounded-md border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:ring-2"
              rows="1"
            ></textarea>
            <button
              @click="publishMessageToTopic"
              class="btn btn-success w-full py-2 text-sm active:scale-95"
            >
              Publish →
            </button>
          </div>
        </div>

        <!-- Messages section -->
        <div
          class="flex min-h-75 flex-col rounded-lg border border-gray-100 bg-white shadow-sm md:min-h-100"
        >
          <div
            class="flex items-center justify-between border-b border-gray-50 p-1"
          >
            <div class="text-sm font-bold text-gray-800">
              Messages
              <span class="text-primary ml-1 font-mono"
                >({{ mqttConn.messages.value.length }})</span
              >
            </div>
            <button
              @click="mqttConn.clearMessages()"
              class="hover:text-error text-sm font-bold tracking-wider text-gray-400 uppercase transition-colors"
            >
              Clear
            </button>
          </div>

          <div
            v-if="mqttConn.messages.value.length === 0"
            class="flex flex-1 flex-col items-center justify-center p-6 text-gray-400"
          >
            <div
              class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50"
            >
              <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                ></path>
              </svg>
            </div>
            <p class="text-xs">
              {{
                mqttConn.isConnected.value
                  ? "Waiting for messages…"
                  : "Connect to start receiving"
              }}
            </p>
          </div>

          <div class="flex-1 space-y-1 overflow-y-auto p-2">
            <div
              v-for="message in mqttConn.messages.value"
              :key="message.id"
              class="rounded p-2 text-xs transition-all"
              :class="[
                message.topic === 'system'
                  ? 'border-l-3 border-gray-400 bg-gray-50 text-gray-600 italic'
                  : 'border border-gray-100 bg-white shadow-sm',
              ]"
            >
              <div class="mb-1 flex items-start justify-between gap-2">
                <span
                  v-if="message.topic !== 'system'"
                  class="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                  >{{ message.topic }}</span
                >
                <span
                  v-else
                  class="shrink-0 font-mono text-[9px] font-bold text-gray-400 uppercase"
                  >SYS</span
                >
                <span
                  class="ml-auto shrink-0 font-mono text-[9px] text-gray-300"
                  >{{ message.timestamp }}</span
                >
              </div>
              <pre
                class="overflow-x-auto rounded border border-gray-100/50 bg-gray-50 p-1.5 font-mono text-[10px] break-all whitespace-pre-wrap text-gray-700"
                >{{ message.payload }}</pre>
            </div>
          </div>
        </div>
      </AppPageContent>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import AppPageContent from "@/components/layout/AppPageContent.vue";
import { useMqttConnection } from "../composables/useMqttConnection";
import { useAppLifecycle } from "../composables/useAppLifecycle";
import type { ServiceEntry } from "../composables/useAppState";

export default defineComponent({
  name: "MQTTClientView",
  components: {
    AppPageContent,
  },
  setup() {
    const route = useRoute();
    const mqttConn = useMqttConnection();

    // Build service from query params (backward compat) or use connected broker
    const service: ServiceEntry = mqttConn.connectedBroker.value ?? {
      name: (route.query.name as string) || "Unknown Service",
      type: (route.query.type as string) || "_mqtt._tcp.",
      host: (route.query.host as string) || "localhost",
      port:
        parseInt((route.query.port as string) || "8883", 10) ||
        import.meta.env.VITE_MQTT_BROKER_PORT ||
        8883,
      discovered: (route.query.discovered as string) === "true",
      txtRecord: route.query.txtRecord
        ? JSON.parse(route.query.txtRecord as string)
        : {},
    };

    const publishTopic = ref<string>("test/topic");
    const publishMessage = ref<string>("Hello, MQTT!");

    const serviceName = computed(() => service.name || "MQTT Service");

    const connectToBroker = () => {
      mqttConn.connect(service);
    };

    const publishMessageToTopic = async () => {
      if (
        mqttConn.isConnected.value &&
        publishTopic.value &&
        publishMessage.value
      ) {
        try {
          await mqttConn.publish(publishTopic.value, publishMessage.value);
        } catch (_) {
          // error is set in composable
        }
      }
    };

    onMounted(() => {
      mqttConn.clearMessages();
      mqttConn.addMessage("system", `Configured for ${serviceName.value}`);
      // If not already connected, auto-connect
      if (mqttConn.connectionState.value === "disconnected") {
        connectToBroker();
      }
    });

    // Blur focused element when page hides (accessibility)
    const { isActive } = useAppLifecycle();
    watch(isActive, (active) => {
      if (!active) {
        (document.activeElement as HTMLElement)?.blur();
      }
    });

    return {
      service,
      serviceName,
      publishTopic,
      publishMessage,
      mqttConn,
      connectToBroker,
      publishMessageToTopic,
    };
  },
});
</script>

<style scoped></style>

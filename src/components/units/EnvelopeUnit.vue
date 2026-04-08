<template>
  <div
    class="rounded-xl border border-gray-200 border-l-4 bg-white shadow-sm transition-colors duration-300"
    :class="{
      'border-l-emerald-500': status.color === 'success',
      'border-l-amber-500': status.color === 'warning',
      'border-l-red-500': status.color === 'danger',
    }"
  >
    <div class="border-b border-gray-100 px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <AppUnitIcon name="envelope" class="text-gray-500" />
          <span>Envelope</span>
        </div>
        <div class="flex flex-col items-end gap-1">
          <AppStatusBadge :color="status.color">
            {{ status.status.toUpperCase() }}
          </AppStatusBadge>
        </div>
      </div>
    </div>

    <div class="px-4 py-3">
      <div v-if="Object.keys(groupedSensors).length > 0">
        <div class="mb-4">
          <div
            class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"
          >
            <!-- Primary metrics -->
            <div
              v-for="metric in primaryMetrics"
              :key="`primary-${metric}`"
              class="bg-ion-light rounded-lg p-3 border-2 border-ion-primary"
            >
              <div class="font-bold text-[0.9em] text-ion-primary mb-2">
                {{ formatMetricName(metric) }}
              </div>
              <div class="flex flex-col gap-1">
                <div
                  v-for="reading in getMetricReadings(metric)"
                  :key="reading.deviceId"
                  class="flex items-center justify-between rounded bg-white px-2 py-1"
                  :class="{
                    'border-l-[3px] border-l-emerald-500':
                      getMetricAgeClass(reading.lastUpdate) === 'metric-fresh',
                    'border-l-[3px] border-l-amber-500':
                      getMetricAgeClass(reading.lastUpdate) ===
                      'metric-warning',
                    'border-l-[3px] border-l-red-500':
                      getMetricAgeClass(reading.lastUpdate) === 'metric-stale',
                  }"
                >
                    <span class="font-bold text-[1.1em] text-sky-600">{{
                    formatMetricValue(metric, reading.value)
                  }}</span>
                    <span class="text-[0.8em] text-gray-500"
                    >{{ reading.deviceType }} ({{
                      reading.deviceId.slice(-4)
                    }})</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import AppStatusBadge from "@/components/layout/AppStatusBadge.vue";
import AppUnitIcon from "@/components/layout/AppUnitIcon.vue";
import { useDeviceMapping } from "@/composables/useDeviceMapping";

const { getUnitStatus, getGroupedSensors, getFilteredMetrics } =
  useDeviceMapping();

// Reactive timestamp for age calculations
const reactiveTime = ref(Date.now());
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  // Update every 5 seconds for smooth age updates
  timeUpdateInterval = setInterval(() => {
    reactiveTime.value = Date.now();
  }, 5000);
});

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
});

const status = computed(() => getUnitStatus("Envelope"));
const groupedSensors = computed(() => getGroupedSensors("Envelope"));
const filteredMetrics = computed(() => getFilteredMetrics("Envelope"));

// Get primary metrics for prominent display
const primaryMetrics = computed(() => filteredMetrics.value.primary);

// Get all readings for a specific metric across all sensor types
const getMetricReadings = (metric: string) => {
  const readings: Array<{
    value: any;
    deviceId: string;
    deviceType: string;
    lastUpdate: number;
  }> = [];

  Object.values(groupedSensors.value)
    .flat()
    .forEach((sensor) => {
      if (sensor.decodedValue && sensor.decodedValue[metric] !== undefined) {
        readings.push({
          value: sensor.decodedValue[metric],
          deviceId: sensor.deviceId,
          deviceType: sensor.deviceType,
          lastUpdate: sensor.lastUpdate,
        });
      }
    });

  // Sort by most recent first
  return readings.sort((a, b) => b.lastUpdate - a.lastUpdate);
};

const formatMetricName = (metric: string): string => {
  const formatMap: Record<string, string> = {
    temp: "Temperature",
    pressure: "Pressure",
    hum: "Humidity",
    level: "Tank Level",
    batpct: "Battery",
    rssi: "Signal",
    accelerationX: "Accel X",
    accelerationY: "Accel Y",
    accelerationZ: "Accel Z",
  };
  return formatMap[metric] || metric.charAt(0).toUpperCase() + metric.slice(1);
};

const formatMetricValue = (metric: string, value: any): string => {
  if (value === null || value === undefined) return "N/A";

  const formatters: Record<string, (v: any) => string> = {
    temp: (v) => `${v.toFixed(1)}°C`,
    press: (v) => `${v} hPa`,
    hum: (v) => `${v.toFixed(0)}%`,
    level: (v) => `${v}%`,
    batpct: (v) => `${v}%`,
    rssi: (v) => `${v} dBm`,
    accelerationX: (v) => `${v} g`,
    accelerationY: (v) => `${v} g`,
    accelerationZ: (v) => `${v} g`,
  };

  const formatter = formatters[metric];
  return formatter ? formatter(value) : String(value);
};

const getMetricAgeClass = (lastUpdate: number): string => {
  const ageMs = reactiveTime.value - lastUpdate;
  if (ageMs <= 30000) return "metric-fresh";
  if (ageMs <= 60000) return "metric-warning";
  return "metric-stale";
};
</script>

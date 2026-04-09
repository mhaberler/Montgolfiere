<template>
  <div class="space-y-4">
    <div v-if="showActions" class="flex items-center justify-end gap-2">
      <button class="btn btn-primary text-sm" @click="clearBLEDevices">
        Clear
      </button>
      <button class="btn btn-primary text-sm" @click="restartBLEScan">
        Restart
      </button>
    </div>

    <div
      v-if="sortedDevices.length > 0"
      class="overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      <div
        v-for="device in sortedDevices"
        :key="device.scanResult.device.deviceId"
        class="grid grid-cols-2 gap-1 border-b border-gray-200 px-2 py-1 last:border-b-0"
      >
        <div>
          <p class="text-base font-semibold">
            {{ device.scanResult.device.name || "Unnamed Device" }}
          </p>
          <p class="text-sm text-gray-600">
            ID: {{ device.scanResult.device.deviceId }}
          </p>
          <p class="text-sm text-gray-600">
            RSSI: {{ device.scanResult.rssi }} dBm
          </p>
          <p v-if="device.decoded.type" class="text-sm text-gray-600">
            Type: {{ device.decoded.type }}
          </p>
          <p class="text-sm italic text-gray-500">
            Last seen:
            {{ Math.floor((reactiveTime - device.lastSeen) / 1000) }}s ago
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex flex-1 items-center justify-end">
            <select
              :value="getDeviceUnit(device.scanResult.device.deviceId) ?? ''"
              @change="
                assignDevice(
                  device.scanResult.device.deviceId,
                  parseUnitType(($event.target as HTMLSelectElement).value),
                )
              "
              class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm"
            >
              <option value="">Unassigned</option>
              <option
                v-for="unitType in unitTypes"
                :key="unitType"
                :value="unitType"
              >
                {{ UNIT_CONFIGS[unitType].name }}
              </option>
            </select>
          </div>

          <div
            v-if="device.decoded.value"
            class="flex flex-1 items-center justify-center"
          >
            <details
              class="w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <summary
                class="cursor-pointer list-none px-3 py-2 text-sm font-medium text-gray-700"
              >
                {{ Object.keys(device.decoded.value).length }} metrics
              </summary>
              <div class="p-2">
                <div
                  v-for="(value, key) in device.decoded.value"
                  :key="key"
                  class="flex items-center justify-between border-b border-gray-200 py-1 last:border-b-0"
                >
                  <span class="text-sm font-medium text-gray-500"
                    >{{ key }}:</span
                  >
                  <span
                    class="tabular-nums text-sm font-semibold text-gray-900"
                    >{{ value }}</span
                  >
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>

    <p v-else-if="!isScanning" class="text-sm text-gray-500">
      No devices found. Start scanning to discover BLE devices.
    </p>

    <div v-if="isScanning" class="flex justify-center py-5">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
      ></div>
    </div>

    <p v-if="bleErrorMsg" class="text-sm text-red-600">
      {{ bleErrorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  bleErrorMsg,
  clearBLEDevices,
  devices,
  isScanning,
  restartBLEScan,
} from "@/sensors/blesensors";
import { useDeviceMapping, unitTypes } from "@/composables/useDeviceMapping";
import { UNIT_CONFIGS, type UnitType } from "@/types/units";

withDefaults(
  defineProps<{
    showActions?: boolean;
  }>(),
  {
    showActions: true,
  },
);

const { assignDeviceToUnit, getDeviceUnit } = useDeviceMapping();

const reactiveTime = ref(Date.now());
let reactiveTimer: number | undefined;

onMounted(() => {
  reactiveTimer = window.setInterval(() => {
    reactiveTime.value = Date.now();
  }, 5000);
});

onUnmounted(() => {
  if (reactiveTimer !== undefined) clearInterval(reactiveTimer);
});

const assignDevice = (deviceId: string, unitType: UnitType | null) => {
  assignDeviceToUnit(deviceId, unitType);
};

const parseUnitType = (value: string): UnitType | null => {
  return value ? (value as UnitType) : null;
};

const sortedDevices = computed(() => {
  return Array.from(devices.value.values()).sort((a, b) => {
    const priorityA = a.decoded.sortingPriority ?? 999;
    const priorityB = b.decoded.sortingPriority ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const typeA = a.decoded.type || "Unknown";
    const typeB = b.decoded.type || "Unknown";
    return typeA.localeCompare(typeB);
  });
});
</script>

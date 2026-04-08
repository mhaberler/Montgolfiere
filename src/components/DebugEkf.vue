<template>
  <div>
    <div
      v-if="showDebugInfo"
      class="w-full border-2 rounded-md p-3 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 relative overflow-hidden dark:bg-slate-800 dark:border-gray-700"
    >
      <div class="mb-3 border-b border-gray-200 pb-2 dark:border-gray-700">
        <div
          class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300"
        >
          EKF & pressure
        </div>
      </div>
      <div>
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          raw Altitude ISA: {{ rawAltitudeISA.toFixed(1) }}
        </p>
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          EKF Altitude ISA/QNH (m): {{ ekfAltitudeISA.toFixed(1) }} /
          {{ ekfAltitudeQNH.toFixed(1) }}
        </p>
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          EKF Velocity (m/s): {{ ekfVelocity.toFixed(2) }}
        </p>
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          EKF Acceleration (mm/s^2): {{ (ekfAcceleration * 1000.0).toFixed(1) }}
        </p>
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          Variance: {{ currentVariance.toFixed(4) }}
        </p>
        <!-- <p>Vspeed sigma: {{ ekfVspeedStdDev.toFixed(4) }}</p> -->
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          Vspeed 95%: {{ vspeedCI95.lower.toFixed(2) }} ..
          {{ vspeedCI95.upper.toFixed(2) }}
        </p>

        <!-- <p>Vaccel sigma: {{ ekfVaccelStdDev.toFixed(4) }}</p> -->
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          Vaccel 95%: {{ vaccelCI95.lower.toFixed(2) }} ..
          {{ vaccelCI95.upper.toFixed(2) }}
        </p>

        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          Pressure (hPa): {{ pressure.toFixed(2) }}
        </p>
        <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">
          Baro rate samples/sec: {{ baroRate.toFixed(1) }}
        </p>
        <div class="flex items-center m-0">
          <span class="text-sm text-gray-600"
            >BLE scan timeouts: {{ bleScanTimeouts }}</span
          >
          <button
            v-if="bleScanTimeouts > 0"
            @click="resetbleScanTimeouts"
            class="ml-auto rounded border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ekfAltitudeISA,
  ekfAltitudeQNH,
  ekfVelocity,
  ekfAcceleration,
  vspeedCI95,
  vaccelCI95,
  currentVariance,
  pressure,
  rawAltitudeISA,
} from "@/process/pressure";

import { bleScanTimeouts, showDebugInfo } from "@/composables/useAppState";

import { resetbleScanTimeouts } from "@/sensors/blesensors";

import { baroRate } from "@/sensors/barometer";
</script>

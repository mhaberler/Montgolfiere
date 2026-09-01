<template>
  <div>
    <div
      v-if="showDebugInfo"
      class="relative w-full overflow-hidden rounded-md border-2 bg-white/95 p-3 shadow-lg backdrop-blur-sm transition-all duration-300 dark:border-gray-700 dark:bg-slate-800"
    >
      <div class="mb-3 border-b border-gray-200 pb-2 dark:border-gray-700">
        <div
          class="text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-300"
        >
          EKF & pressure
        </div>
      </div>
      <div>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          raw Altitude ISA: {{ rawAltitudeISA.toFixed(1) }}
        </p>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          EKF Altitude ISA/QNH (m): {{ ekfAltitudeISA.toFixed(1) }} /
          {{ ekfAltitudeQNH.toFixed(1) }}
        </p>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          EKF Velocity (m/s): {{ ekfVelocity.toFixed(2) }}
        </p>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          EKF Acceleration (mm/s^2): {{ (ekfAcceleration * 1000.0).toFixed(1) }}
        </p>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          Variance: {{ currentVariance.toFixed(4) }}
        </p>
        <!-- <p>Vspeed sigma: {{ ekfVspeedStdDev.toFixed(4) }}</p> -->
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          Vspeed 95%: {{ vspeedCI95.lower.toFixed(2) }} ..
          {{ vspeedCI95.upper.toFixed(2) }}
        </p>

        <!-- <p>Vaccel sigma: {{ ekfVaccelStdDev.toFixed(4) }}</p> -->
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          Vaccel 95%: {{ vaccelCI95.lower.toFixed(2) }} ..
          {{ vaccelCI95.upper.toFixed(2) }}
        </p>

        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          Pressure (hPa): {{ pressure.toFixed(2) }}
        </p>
        <p class="mb-2 text-sm text-gray-700 dark:text-gray-200">
          Baro rate samples/sec: {{ baroRate.toFixed(1) }}
        </p>
        <div class="m-0 flex items-center">
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

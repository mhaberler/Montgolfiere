<template>
    <div>
        <ion-card v-if="showDebugInfo" class="w-full border-2 rounded-md p-3 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 relative overflow-hidden dark:bg-slate-800 dark:border-gray-700">
            <ion-card-header>
                <ion-card-subtitle>EKF & pressure</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">raw Altitude ISA: {{ rawAltitudeISA.toFixed(1) }}</p>
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">EKF Altitude ISA/QNH (m): {{ ekfAltitudeISA.toFixed(1) }} / {{ ekfAltitudeQNH.toFixed(1) }}</p>
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">EKF Velocity (m/s): {{ ekfVelocity.toFixed(2) }}</p>
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">EKF Acceleration (mm/s^2): {{ (ekfAcceleration * 1000.0).toFixed(1) }}</p>
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">Variance: {{ currentVariance.toFixed(4) }}</p>
                <!-- <p>Vspeed sigma: {{ ekfVspeedStdDev.toFixed(4) }}</p> -->
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">Vspeed 95%: {{ vspeedCI95.lower.toFixed(2) }} .. {{ vspeedCI95.upper.toFixed(2) }}</p>

                <!-- <p>Vaccel sigma: {{ ekfVaccelStdDev.toFixed(4) }}</p> -->
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">Vaccel 95%: {{ vaccelCI95.lower.toFixed(2) }} .. {{ vaccelCI95.upper.toFixed(2) }}</p>


                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">Pressure (hPa): {{ pressure.toFixed(2) }}</p>
                <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">Baro rate samples/sec: {{ baroRate.toFixed(1) }}</p>
                <div class="flex items-center m-0">
                    <span class="text-sm text-gray-600">BLE scan timeouts: {{ bleScanTimeouts }}</span>
                    <ion-button v-if="bleScanTimeouts > 0" fill="outline" size="small" color="warning"
                        @click="resetbleScanTimeouts" class="ml-auto h-6 px-2">
                        Reset
                    </ion-button>
                </div>
            </ion-card-content>
        </ion-card>
    </div>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonButton } from '@ionic/vue';

import {
    ekfAltitudeISA,
    ekfAltitudeQNH,
    ekfVelocity,
    ekfAcceleration,
    vspeedCI95,
    vaccelCI95,
    currentVariance,
    pressure,
    rawAltitudeISA
} from '@/process/pressure'

import {
    bleScanTimeouts,
    showDebugInfo,
} from '@/composables/useAppState';

import {
    resetbleScanTimeouts
} from '@/sensors/blesensors';

import {
    baroRate,
} from '@/sensors/barometer';

</script>
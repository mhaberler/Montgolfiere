<template>
    <div v-if="Object.keys(groupedSensors).length > 0">


        <ion-card class="border-l-4 border-ion-medium transition-colors duration-300" :class="{
            'border-l-ion-success': status.color === 'success',
            'border-l-ion-warning': status.color === 'warning',
            'border-l-ion-danger': status.color === 'danger'
        }">
            <ion-card-header>
                <ion-card-title class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <ion-icon :icon="flameOutline" />
                        <span>{{ unitType }}</span>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <ion-badge :color="status.color">
                            {{ status.status.toUpperCase() }}
                        </ion-badge>
                    </div>
                </ion-card-title>
            </ion-card-header>

            <ion-card-content>
                <div v-if="Object.keys(groupedSensors).length > 0">

                    <!-- Consolidated Metrics Display -->
                    <div class="mb-4">
                        <div class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                            <!-- Primary metrics -->
                            <div v-for="metric in primaryMetrics" :key="`primary-${metric}`"
                                class="bg-ion-light rounded-lg p-3 border-2 border-ion-primary">
                                <div class="font-bold text-[0.9em] text-ion-primary mb-2">{{ formatMetricName(metric) }}</div>
                                <div class="flex flex-col gap-1">
                                    <div v-for="reading in getMetricReadings(metric)" :key="reading.deviceId"
                                        class="flex justify-between items-center px-2 py-1 rounded bg-white" :class="{
                                            'border-l-[3px] border-l-ion-success': getMetricAgeClass(reading.lastUpdate) === 'metric-fresh',
                                            'border-l-[3px] border-l-ion-warning': getMetricAgeClass(reading.lastUpdate) === 'metric-warning',
                                            'border-l-[3px] border-l-ion-danger': getMetricAgeClass(reading.lastUpdate) === 'metric-stale'
                                        }">
                                        <span class="font-bold text-[1.1em] text-ion-primary">{{ formatMetricValue(metric, reading.value) }}</span>
                                        <span class="text-[0.8em] text-ion-medium">{{ reading.deviceType }} ({{ reading.deviceId.slice(-4)
                                            }})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ion-card-content>
        </ion-card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import {
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonBadge, IonText, IonButton
} from '@ionic/vue';
import { flameOutline } from 'ionicons/icons';
import { useDeviceMapping } from '@/composables/useDeviceMapping';
import type { UnitType } from '@/types/units';

interface Props {
    unitType: UnitType;
}

const props = defineProps<Props>();

const {
    getUnitStatus,
    getGroupedSensors,
    getFilteredMetrics
} = useDeviceMapping();

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

const status = computed(() => getUnitStatus(props.unitType));
const groupedSensors = computed(() => getGroupedSensors(props.unitType));

// Get primary metrics for prominent display
const primaryMetrics = computed(() => getFilteredMetrics(props.unitType).primary);

// Get all readings for a specific metric across all sensor types
const getMetricReadings = (metric: string) => {
    const readings: Array<{
        value: any;
        deviceId: string;
        deviceType: string;
        lastUpdate: number;
    }> = [];

    Object.values(groupedSensors.value).flat().forEach(sensor => {
        if (sensor.decodedValue && sensor.decodedValue[metric] !== undefined) {
            readings.push({
                value: sensor.decodedValue[metric],
                deviceId: sensor.deviceId,
                deviceType: sensor.deviceType,
                lastUpdate: sensor.lastUpdate
            });
        }
    });

    // Sort by most recent first
    return readings.sort((a, b) => b.lastUpdate - a.lastUpdate);
};

const formatMetricName = (metric: string): string => {
    const formatMap: Record<string, string> = {
        temperature: 'Temperature',
        bar: 'Pressure',
        humidity: 'Humidity',
        level: 'Tank Level',
        voltage: 'Battery',
        rssi: 'Signal',
        accelerationX: 'Accel X',
        accelerationY: 'Accel Y',
        accelerationZ: 'Accel Z'
    };
    return formatMap[metric] || metric.charAt(0).toUpperCase() + metric.slice(1);
};

const formatMetricValue = (metric: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    const formatters: Record<string, (v: any) => string> = {
        temperature: (v) => `${v}°C`,
        bar: (v) => `${v.toFixed(1)} bar`,
        humidity: (v) => `${v}%`,
        level: (v) => `${v} mm`,
        percent: (v) => `${v}%`,
        voltage: (v) => `${v}V`,
        rssi: (v) => `${v} dBm`,
        accelerationX: (v) => `${v} g`,
        accelerationY: (v) => `${v} g`,
        accelerationZ: (v) => `${v} g`
    };

    const formatter = formatters[metric];
    return formatter ? formatter(value) : String(value);
};

const getMetricAgeClass = (lastUpdate: number): string => {
    const ageMs = reactiveTime.value - lastUpdate;
    if (ageMs <= 30000) return 'metric-fresh';
    if (ageMs <= 60000) return 'metric-warning';
    return 'metric-stale';
};
</script>


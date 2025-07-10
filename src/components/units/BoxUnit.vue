<template>
    <!-- <div v-if="Object.keys(groupedSensors).length > 0"> -->

        <ion-card class="unit-card" :class="`status-${status.color}`">
            <ion-card-header>
                <ion-card-title class="unit-title">
                    <div class="title-content">
                        <ion-icon :icon="batteryHalfOutline" />
                        <span>Box</span>
                    </div>
                    <div class="status-indicator">
                        <ion-badge :color="status.color" class="status-badge">
                            {{ status.status.toUpperCase() }}
                        </ion-badge>
                    </div>
                </ion-card-title>
            </ion-card-header>

            <ion-card-content>
                <div v-if="Object.keys(groupedSensors).length > 0" class="data-display">

                    <div class="consolidated-metrics">
                        <div class="metrics-grid">
                            <!-- Primary metrics -->
                            <div v-for="metric in primaryMetrics" :key="`primary-${metric}`"
                                class="metric-card primary">
                                <div class="metric-label primary">{{ formatMetricName(metric) }}</div>
                                <div class="metric-values">
                                    <div v-for="reading in getMetricReadings(metric)" :key="reading.deviceId"
                                        class="metric-reading primary" :class="getMetricAgeClass(reading.lastUpdate)">
                                        <span class="value">{{ formatMetricValue(metric, reading.value) }}</span>
                                        <span class="source">{{ reading.deviceType }} ({{ reading.deviceId.slice(-4)
                                        }})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- <div v-else class="no-data">
                    <ion-text color="medium">No sensors assigned</ion-text>
                    <ion-button fill="clear" size="small" @click="$emit('assign-device')">
                        Assign Device
                    </ion-button>
                </div> -->
            </ion-card-content>
        </ion-card>
    <!-- </div> -->
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import {
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonBadge, IonText, IonButton,
} from '@ionic/vue';
import { batteryHalfOutline } from 'ionicons/icons';
import { useDeviceMapping } from '@/composables/useDeviceMapping';

defineEmits(['assign-device']);

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


const status = computed(() => getUnitStatus('Box'));
const groupedSensors = computed(() => getGroupedSensors('Box'));
const filteredMetrics = computed(() => getFilteredMetrics('Box'));

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
        voltage_V: 'Voltage',
        current_A: 'Current',
    };
    return formatMap[metric] || metric.charAt(0).toUpperCase() + metric.slice(1);
};

const formatMetricValue = (metric: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    const formatters: Record<string, (v: any) => string> = {
        voltage_V: (v) => `${v.toFixed(1)} V`,
        current_A: (v) => `${v.toFixed(1)} A`,
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

<style scoped>
.unit-card {
    border-left: 4px solid var(--ion-color-medium);
    transition: border-color 0.3s ease;
}

.unit-card.status-success {
    border-left-color: var(--ion-color-success);
}

.unit-card.status-warning {
    border-left-color: var(--ion-color-warning);
}

.unit-card.status-danger {
    border-left-color: var(--ion-color-danger);
}

.unit-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.title-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-indicator {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}

.consolidated-metrics {
    margin-bottom: 16px;
}

.metrics-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.metric-card {
    background: var(--ion-color-light);
    border-radius: 8px;
    padding: 12px;
}

.metric-label {
    font-weight: bold;
    font-size: 0.9em;
    color: var(--ion-color-dark);
    margin-bottom: 8px;
}

.metric-values {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.metric-reading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    background: white;
}

.metric-reading.metric-fresh {
    border-left: 3px solid var(--ion-color-success);
}

.metric-reading.metric-warning {
    border-left: 3px solid var(--ion-color-warning);
}

.metric-reading.metric-stale {
    border-left: 3px solid var(--ion-color-danger);
}

.metric-reading .value {
    font-weight: 600;
    font-size: 1.1em;
}

.metric-reading .source {
    font-size: 0.8em;
    color: var(--ion-color-medium);
}

.sensor-groups {
    margin-top: 16px;
}

.sensor-type-content {
    padding: 12px;
}

.sensor-detail {
    background: var(--ion-color-light);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
}

.sensor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-weight: bold;
}

.device-id {
    font-family: monospace;
    background: var(--ion-color-primary);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8em;
}

.update-time {
    font-size: 0.8em;
    padding: 2px 6px;
    border-radius: 3px;
}

.age-fresh {
    color: var(--ion-color-success);
}

.age-warning {
    color: var(--ion-color-warning);
}

.age-stale {
    color: var(--ion-color-danger);
}

.sensor-data {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
}

.data-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9em;
    padding: 4px 0;
}

/* Primary metrics styling */
.data-row.primary-metric {
    background: var(--ion-color-primary-tint);
    padding: 6px;
    border-radius: 4px;
    margin-bottom: 4px;
}

.data-label.primary {
    color: var(--ion-color-primary-shade);
    font-weight: 600;
}

.data-value.primary {
    font-weight: 700;
    color: var(--ion-color-primary);
}

/* Secondary metrics styling */
.data-row.secondary-metric {
    background: var(--ion-color-light);
    padding: 4px;
    border-radius: 3px;
    margin-bottom: 2px;
}

.data-label.secondary {
    color: var(--ion-color-dark);
    font-weight: 500;
}

.data-value.secondary {
    font-weight: 600;
}

/* Utility metrics styling */
.utility-metrics {
    margin-top: 8px;
    border-top: 1px solid var(--ion-color-light);
    padding-top: 8px;
}

.utility-toggle {
    --padding-start: 0;
    --padding-end: 0;
    margin: 0;
    height: auto;
    font-size: 0.8em;
}

.utility-data {
    margin-top: 8px;
}

.data-row.utility-metric {
    opacity: 0.8;
    font-size: 0.85em;
}

.data-label.utility {
    color: var(--ion-color-medium-shade);
    font-weight: 400;
}

.data-value.utility {
    font-weight: 500;
    color: var(--ion-color-medium-shade);
}

/* Consolidated metrics styling */
.metric-card.primary {
    border: 2px solid var(--ion-color-primary);
    background: var(--ion-color-light);
}

.metric-label.primary {
    color: var(--ion-color-primary);
}

.metric-reading.primary .value {
    color: var(--ion-color-primary);
    font-weight: 700;
}

.no-data {
    text-align: center;
    /* padding: 20px; */
}
</style>

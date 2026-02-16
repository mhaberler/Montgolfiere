<template>
    <div class="overflow-x-auto bg-white rounded-lg">
        <table class="w-full border-collapse text">
            <thead>
                <tr>
                    <th class="bg-gray-100 px-2 py-1.5 text-left font-semibold text-gray-700 border-b-2 border-gray-200 w-20">Unit</th>
                    <th class="bg-gray-100 px-2 py-1.5 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Metrics</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="unit in unitsData" :key="unit.type" :class="{
                    'bg-emerald-500/5': unit.status.color === 'success',
                    'bg-amber-500/10': unit.status.color === 'warning',
                    'bg-red-500/10': unit.status.color === 'danger'
                }">
                    <td class="px-2 py-1 border-b border-gray-200 align-middle font-medium">
                        <div class="flex items-center gap-1">
                            <ion-icon :icon="unit.icon" class="text-base text-gray-500" />
                            <span>{{ unit.label }}</span>
                        </div>
                    </td>
                    <td class="px-2 py-1 border-b border-gray-200 align-middle">
                        <div class="flex flex-wrap gap-1 items-center">
                            <span v-for="(metric, idx) in unit.metrics" :key="metric.name"
                                class="inline-flex items-center gap-0.5 whitespace-nowrap" :class="{
                                    'text-emerald-600 font-semibold': getMetricAgeClass(metric.lastUpdate) === 'age-fresh',
                                    'text-gray-800 font-semibold': getMetricAgeClass(metric.lastUpdate) === 'age-recent',
                                    'text-amber-600 font-semibold': getMetricAgeClass(metric.lastUpdate) === 'age-stale',
                                    'text-red-600 font-semibold opacity-70': getMetricAgeClass(metric.lastUpdate) === 'age-old',
                                }">
                                <span class="text-gray-500 text-xs">{{ metric.name }}:</span>
                                <span>{{ metric.formattedValue }}</span>
                                <span v-if="idx < unit.metrics.length - 1" class="text-gray-300 mx-0.5">|</span>
                            </span>
                            <span v-if="unit.metrics.length === 0" class="text-gray-400">--</span>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import { balloonOutline, thermometerOutline, flameOutline, batteryHalfOutline, paperPlaneOutline, toggleOutline } from 'ionicons/icons';
import { useDeviceMapping } from '@/composables/useDeviceMapping';
import type { UnitType } from '@/types/units';

const {
    getUnitStatus,
    getGroupedSensors,
    getFilteredMetrics
} = useDeviceMapping();

// Reactive timestamp for age calculations
const reactiveTime = ref(Date.now());
let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    timeUpdateInterval = setInterval(() => {
        reactiveTime.value = Date.now();
    }, 5000);
});

onUnmounted(() => {
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }
});

interface UnitConfig {
    type: UnitType;
    label: string;
    icon: string;
}

const unitConfigs: UnitConfig[] = [
    { type: 'Envelope', label: 'Env', icon: balloonOutline },
    { type: 'OAT', label: 'OAT', icon: thermometerOutline },
    { type: 'Tank1', label: 'Tank1', icon: flameOutline },
    { type: 'Tank2', label: 'Tank2', icon: flameOutline },
    { type: 'Tank3', label: 'Tank3', icon: flameOutline },
    { type: 'Box', label: 'Box', icon: batteryHalfOutline },
    { type: 'Vario', label: 'Vario', icon: paperPlaneOutline },
    { type: 'Switch', label: 'Switch', icon: toggleOutline },
];

// Metric formatting functions
const formatMetricName = (metric: string): string => {
    const nameMap: Record<string, string> = {
        temp: 'Temp',
        temperature: 'Temp',
        hum: 'Hum',
        humidity: 'Hum',
        percent: '%',
        level: 'Level',
        bar: 'Bar',
        batpct: 'Bat',
        voltage: 'V',
        voltage_V: 'V',
        current_A: 'A',
        pressure: 'Press',
        qualityStars: 'Qual',
        "distance (m)_m": 'm',
        "speed_m/s": 'm/s',
        "acceleration_m/s²": 'm/s²',
        reed_switch: 'Reed',
        window: 'Window',
    };
    return nameMap[metric] || metric;
};

const formatMetricValue = (metric: string, value: any): string => {
    if (value === undefined || value === null) return '--';

    const formatMap: Record<string, (v: any) => string> = {
        temp: (v) => `${v.toFixed(1)}°`,
        temperature: (v) => `${v.toFixed(1)}°`,
        hum: (v) => `${v.toFixed(0)}%`,
        humidity: (v) => `${v.toFixed(0)}%`,
        percent: (v) => `${v.toFixed(0)}%`,
        level: (v) => `${v.toFixed(0)}mm`,
        bar: (v) => `${v.toFixed(1)}`,
        batpct: (v) => `${v.toFixed(0)}%`,
        voltage: (v) => `${v.toFixed(2)}V`,
        voltage_V: (v) => `${v.toFixed(2)}V`,
        current_A: (v) => `${v.toFixed(2)}A`,
        pressure: (v) => `${v.toFixed(0)}`,
        qualityStars: (v) => `${v}★`,
        "distance (m)_m": (v) => `${v.toFixed(1)}`,
        "speed_m/s": (v) => `${v.toFixed(1)}`,
        "acceleration_m/s²": (v) => `${v.toFixed(3)}`,
        reed_switch: (v) => v ? 'Closed' : 'Open',
        window: (v) => v ? 'Closed' : 'Open',
    };

    const formatter = formatMap[metric];
    if (formatter && typeof value === 'number') {
        return formatter(value);
    }
    if (formatter && typeof value === 'boolean' && metric === 'reed_switch') {
        return formatter(value);
    }
    return String(value);
};

const getMetricAgeClass = (lastUpdate: number): string => {
    const age = reactiveTime.value - lastUpdate;
    if (age < 10000) return 'age-fresh';
    if (age < 30000) return 'age-recent';
    if (age < 60000) return 'age-stale';
    return 'age-old';
};

// Get all metrics for a unit
const getUnitMetrics = (unitType: UnitType) => {
    const groupedSensors = getGroupedSensors(unitType);
    const filteredMetrics = getFilteredMetrics(unitType);
    const primaryMetrics = filteredMetrics.primary;

    const metrics: Array<{
        name: string;
        formattedValue: string;
        lastUpdate: number;
    }> = [];

    // Collect primary metrics
    for (const metric of primaryMetrics) {
        const readings: Array<{ value: any; lastUpdate: number }> = [];

        Object.values(groupedSensors).flat().forEach(sensor => {
            if (sensor.decodedValue && sensor.decodedValue[metric] !== undefined) {
                readings.push({
                    value: sensor.decodedValue[metric],
                    lastUpdate: sensor.lastUpdate
                });
            }
        });

        if (readings.length > 0) {
            // Use the most recent reading
            const latestReading = readings.reduce((a, b) =>
                a.lastUpdate > b.lastUpdate ? a : b
            );
            metrics.push({
                name: formatMetricName(metric),
                formattedValue: formatMetricValue(metric, latestReading.value),
                lastUpdate: latestReading.lastUpdate
            });
        }
    }

    return metrics;
};

// Compute all units data
const unitsData = computed(() => {
    // Access reactiveTime to ensure reactivity
    const _ = reactiveTime.value;

    return unitConfigs.map(config => {
        const groupedSensors = getGroupedSensors(config.type);
        const hasSensors = Object.keys(groupedSensors).length > 0;

        return {
            type: config.type,
            label: config.label,
            icon: config.icon,
            status: getUnitStatus(config.type),
            metrics: hasSensors ? getUnitMetrics(config.type) : [],
            hasSensors
        };
    }).filter(unit => unit.hasSensors);
});
</script>

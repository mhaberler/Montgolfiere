<template>
    <div class="units-table-container">
        <table class="units-table">
            <thead>
                <tr>
                    <th class="unit-name-col">Unit</th>
                    <th class="metrics-col">Metrics</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="unit in unitsData" :key="unit.type" :class="`status-row-${unit.status.color}`">
                    <td class="unit-name-cell">
                        <div class="unit-name-content">
                            <ion-icon :icon="unit.icon" class="unit-icon" />
                            <span>{{ unit.label }}</span>
                        </div>
                    </td>
                    <td class="metrics-cell">
                        <div class="metrics-inline">
                            <span v-for="(metric, idx) in unit.metrics" :key="metric.name"
                                class="metric-item" :class="getMetricAgeClass(metric.lastUpdate)">
                                <span class="metric-name">{{ metric.name }}:</span>
                                <span class="metric-value">{{ metric.formattedValue }}</span>
                                <span v-if="idx < unit.metrics.length - 1" class="metric-separator">|</span>
                            </span>
                            <span v-if="unit.metrics.length === 0" class="no-data">--</span>
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
import { balloonOutline, thermometerOutline, flameOutline, batteryHalfOutline } from 'ionicons/icons';
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
    { type: 'Envelope', label: 'Envelope', icon: balloonOutline },
    { type: 'OAT', label: 'OAT', icon: thermometerOutline },
    { type: 'Tank1', label: 'Tank1', icon: flameOutline },
    { type: 'Tank2', label: 'Tank2', icon: flameOutline },
    { type: 'Tank3', label: 'Tank3', icon: flameOutline },
    { type: 'Box', label: 'Box', icon: batteryHalfOutline },
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
    };

    const formatter = formatMap[metric];
    if (formatter && typeof value === 'number') {
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

<style scoped>
.units-table-container {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
}

.units-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.units-table th {
    background: #f3f4f6;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
}

.units-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
}

.unit-name-col {
    width: 80px;
}

.metrics-col {
    width: auto;
}

.unit-name-cell {
    font-weight: 500;
}

.unit-name-content {
    display: flex;
    align-items: center;
    gap: 4px;
}

.unit-icon {
    font-size: 1rem;
    color: #6b7280;
}

.status-badge-small {
    font-size: 0.65rem;
    padding: 2px 6px;
}

.metrics-inline {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
}

.metric-item {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
}

.metric-name {
    color: #6b7280;
    font-size: 0.75rem;
}

.metric-value {
    font-weight: 600;
    color: #111827;
}

.metric-separator {
    color: #d1d5db;
    margin: 0 2px;
}

.no-data {
    color: #9ca3af;
}

/* Status row backgrounds */
.status-row-success {
    background-color: rgba(16, 185, 129, 0.05);
}

.status-row-warning {
    background-color: rgba(245, 158, 11, 0.1);
}

.status-row-danger {
    background-color: rgba(239, 68, 68, 0.1);
}

/* Age-based styling */
.age-fresh .metric-value {
    color: #059669;
}

.age-recent .metric-value {
    color: #111827;
}

.age-stale .metric-value {
    color: #d97706;
}

.age-old .metric-value {
    color: #dc2626;
    opacity: 0.7;
}
</style>

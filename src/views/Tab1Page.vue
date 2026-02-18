<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Flight status</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content :fullscreen="true">
            <div class="bg-white shadow-xl rounded-xl">
                <div class="grid grid-cols-4 gap-1">
                    <ValueCard name="GPS" :value="location?.coords?.altitude" unit="m" :decimals="0" />

                    <ValueCard :value="useFlightLevel ? `FL${flightLevel.toString().padStart(3, '0')}` : ekfAltitudeQNH"
                        :name="useFlightLevel ? 'Flightlevel' : 'MSL'" :decimals="useFlightLevel ? 0 : 0"
                        :unit="useFlightLevel ? '' : 'm'" />

                    <ValueCard name="speed" :value="formatSpeed(location?.coords?.speed)" :decimals="0" unit="km/h" />
                    <ValueCard name="heading" :value="formatHeading(location?.coords?.speed, location?.coords?.heading)"
                        :decimals="0" unit="°" />

                    <ValueCard :value="ekfVelocity" name="vSpeed" :decimals="1" unit="m/s" />
                    <ValueCard :value="ekfAcceleration" name="vAccel" :decimals="3" :unit="'m/s\u00B2'" />

                    <ValueCard :value="heightOverGround" name="AGL" :decimals="0" unit="m" />
                    <ValueCard v-on-long-press="() => {
                        if (elevation !== null && elevation !== undefined && !isNaN(elevation)) {
                            showPopup({ name: 'elevation', value: elevation, unit: 'm' })
                        } else {
                            console.warn('Cannot show popup for elevation: invalid value', elevation)
                        }
                    }" :value="elevation" name="elevation" :decimals="0" unit="m"
                        :frameClass="elevation && (!elevationAtTakeoff.value.value || ((Date.now() / 1000 - elevationAtTakeoffTimestamp / 1000) > maxElevationAtTakeoffAge)) ? '!bg-red-200' : ''" />

                    <div class="row-span-3 col-span-1 text-xs w-full h-50">
                        <LinearScale :value="ekfVelocity" orientation="vertical" :scalePadding="15"
                            :indicatorSize="20" :confidenceBoxCrossDimension="10" :confidenceLower="vspeedCI95.lower"
                            :confidenceUpper="vspeedCI95.upper" :transitionDuration="0.95" :majorTicks="vsiMajorTicks"
                            :minorTicks="vsiMinorTicks" :intermediateTicks="vsiIntermediateTicks" :weights="vsiWeights"
                            :majorTickTextOffset="vsiMajorTickTextOffset" :indicatorDistancePercent="22"
                            :confidenceColor="confidenceColor" :confidenceOpacity="0.8" :scaleLinePercent="30" />
                    </div>
                    <div class="row-span-3 col-span-1 text-xs w-full h-50">
                        <LinearScale :value="ekfAcceleration" orientation="vertical" :scalePadding="15"
                            :indicatorSize="20" :confidenceBoxCrossDimension="10" :transitionDuration="0.95"
                            :majorTicks="vaccMajorTicks" :minorTicks="vaccMinorTicks"
                            :intermediateTicks="vaccIntermediateTicks" :weights="vaccWeights"
                            :majorTickTextOffset="vaccMajorTickTextOffset" :indicatorDistancePercent="22"
                            :confidenceLower="vaccelCI95.lower" :confidenceUpper="vaccelCI95.upper"
                            :confidenceColor="confidenceColor" :confidenceOpacity="0.8" :scaleLinePercent="30" />
                    </div>

                    <ValueCard :value="apexLevelRelative" name="ApexRel" :decimals="0" unit="m"
                        :frameClass="willImpactGround ? '!bg-red-200' : 'bg-white'" />
                    <ValueCard :value="ekfTimeToZeroSpeed" name="TTA" :decimals="0" unit="s"
                        :frameClass="willImpactGround ? '!bg-red-200' : 'bg-white'" />

                    <ValueCard :value="BCMT" name="BCMT" unit="UTC" />
                    <ValueCard :value="ECET" name="ECET" unit="UTC" />

                    <ValueCard :value="currentQNH" name="QNH" :decimals="0" :unit="currentQNHsource" />
                    <ValueCard :value="currentTimeUTC" name="TIME" unit="UTC" />

                </div>
                <div class="overflow-y-auto overflow-x-hidden p-2">
                    <UnitsTable />
                </div>
            </div>

            <!-- Modal Popup -->
            <ion-modal ref="modal" :is-open="isModalOpen" @will-dismiss="closeModal">
                <ion-header>
                    <ion-toolbar>
                        <ion-title>{{ modalData?.name || 'Sensor Data' }}</ion-title>
                        <ion-buttons slot="end">
                            <ion-button @click="closeModal">
                                <ion-icon :icon="closeOutline"></ion-icon>
                            </ion-button>
                        </ion-buttons>
                    </ion-toolbar>
                </ion-header>
                <ion-content class="ion-padding">
                    <div v-if="modalData" class="text-center space-y-6">
                        <!-- Current Value Display -->
                        <div class="bg-gray-100 rounded-lg p-6">
                            <h2 class="text-lg font-semibold text-gray-700 mb-2">Current {{ modalData.name }}</h2>
                            <div class="text-4xl font-bold text-blue-600">
                                {{ modalData.value }} {{ modalData.unit }}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="space-y-4">
                            <ion-button expand="block" color="success" size="large" @click="setOnGround">
                                <ion-icon :icon="checkmarkOutline" slot="start"></ion-icon>
                                Set as Ground Level
                            </ion-button>

                            <ion-button expand="block" color="medium" fill="outline" @click="closeModal">
                                Cancel
                            </ion-button>
                        </div>

                        <!-- Info Text -->
                        <div class="text-sm text-gray-600 mt-4">
                            <p>This will set the current {{ modalData.name }} value ({{ modalData.value }} {{
                                modalData.unit }}) as the ground reference level.</p>
                        </div>
                    </div>
                </ion-content>
            </ion-modal>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonModal,
    IonButton,
    IonButtons,
    IonIcon
} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { closeOutline, checkmarkOutline } from 'ionicons/icons';
import { metersToFeet } from '../utils/meteo-utils'

import {
    currentQNH,
    currentQNHsource
} from '../process/qnh';

import {
    BCMT,
    ECET
} from '../process/sun';

import { elevationAtTakeoff, altitudeAtTakeoff } from '@/composables/useAppState';
import ValueCard from '../components/ValueCard.vue';
import LinearScale from '../components/LinearScale.vue';
const confidenceColor = ref('#0de732');
const maxElevationAtTakeoffAge = 3600 * 4; // 4 hours

// Current UTC time
const currentTimeUTC = ref<string>('--:--');
let timeUpdateInterval: number | undefined;

const updateUTCTime = () => {
    const now = new Date();
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    currentTimeUTC.value = `${hours}:${minutes}`;
};

onMounted(() => {
    updateUTCTime();
    timeUpdateInterval = window.setInterval(updateUTCTime, 1000);
});

onUnmounted(() => {
    if (timeUpdateInterval !== undefined) {
        clearInterval(timeUpdateInterval);
    }
});

// Modal state
const isModalOpen = ref(false);
const modalData = ref<{ name: string, value: number, unit: string } | null>(null);
const modal = ref();

// Import flight telemetry refs from centralized app state (with timestamps)
// usePersistedRefWithTimestamp returns { value: Ref<T>, timestamp: Ref<number> }
const elevationAtTakeoffTimestamp = elevationAtTakeoff.timestamp;
const altitudeAtTakeoffTimestamp = altitudeAtTakeoff.timestamp;

const heightOverGround = ref<number | null>(null);
const apexLevelRelative = ref<number | null>(null); // to current altitude

const ekfAltitudeISAfeet = ref<number>(0);
const flightLevel = ref<number>(0);
const useFlightLevel = ref<boolean>(false);
const willImpactGround = ref<boolean>(false);

watch(ekfAltitudeISA, (newekfAltitudeISA) => {
    // console.log(`ekfAltitudeISA is ${newekfAltitudeISA}`)
    ekfAltitudeISAfeet.value = metersToFeet(newekfAltitudeISA);
    useFlightLevel.value = ekfAltitudeISAfeet.value > transitionAltitude.value;
    flightLevel.value = Math.round(ekfAltitudeISAfeet.value / 100.0);
    if (ekfZeroSpeedValid.value) {
        apexLevelRelative.value = -(newekfAltitudeISA - ekfZeroSpeedAltitude.value);
    } else {
        apexLevelRelative.value = null;
    }
    if (elevationAtTakeoff.value.value !== null && altitudeAtTakeoff.value.value != null && elevation.value !== null) {
        const heightAboveTakeoff = newekfAltitudeISA - altitudeAtTakeoff.value.value;
        const elevationABoveTakeoff = elevation.value - elevationAtTakeoff.value.value;
        heightOverGround.value = heightAboveTakeoff - elevationABoveTakeoff;
        if (apexLevelRelative.value != null) {
            willImpactGround.value = (heightOverGround.value - apexLevelRelative.value) < 0;
        } else {
            willImpactGround.value = false;
        }
    } else {
        heightOverGround.value = null;
        willImpactGround.value = false;
    }
})

// Scale configuration
const vsiMajorTicks = ref([-10, -5, -1, 0, 1, 5, 10]);
const vsiMinorTicks = ref([-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1,
    0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9
]);
const vsiIntermediateTicks = ref([-9, -8, -7, -6, -4, -3, -2, -0.5, 0.5, 2, 3, 4, 6, 7, 8, 9]);
//const vsiWeights = ref([0.1, 0.15, 0.25, 0.25, 0.15, 0.1]);
const vsiWeights = ref([0.1, 0.1, 0.3, 0.3, 0.1, 0.1]);

const vsiMajorTickTextOffset = ref(13)

const vaccMajorTicks = ref([-1.0, -0.5, -0.1, 0, 0.1, 0.5, 1.0]);
const vaccMinorTicks = ref([-0.09, -0.08, -0.07, -0.06, -0.04, -0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.04, 0.06, 0.07, 0.08, 0.09]);
const vaccIntermediateTicks = ref([-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1, -0.05, 0.05, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
const vaccWeights = ref([0.1, 0.15, 0.25, 0.25, 0.15, 0.1]);
const vaccMajorTickTextOffset = ref(15)

// Component imports
import UnitsTable from '@/components/units/UnitsTable.vue';

// State imports
import { location, elevation } from '@/sensors/location'
import {
    ekfAltitudeISA,
    ekfAltitudeQNH,
    ekfVelocity,
    ekfAcceleration,
    ekfTimeToZeroSpeed,
    ekfZeroSpeedAltitude,
    ekfZeroSpeedValid,
    vspeedCI95,
    vaccelCI95
} from '@/process/pressure'

// Persistent state imports
import { transitionAltitude } from '../composables/useAppState';


const router = useRouter();

const goToDeviceAssignment = () => {
    router.push('/tabs/tab2');
};

function formatHeading(speed: number | null | undefined, heading: number | null | undefined) {
    if (speed === null || speed === undefined || isNaN(speed) || speed < 0.1) {
        return '--'
    }
    if (heading === null || heading === undefined || isNaN(heading)) {
        return '--'
    }
    return heading
}

function formatSpeed(speed: number | null | undefined) {
    if (speed === null || speed === undefined || isNaN(speed) || speed < 0.1) {
        return '--'
    }    // Convert from m/s to km/h if needed, or just round
    return Math.round(speed * 3.6)
}

// Modal functions
const showPopup = (data: { name: string, value: number, unit: string }) => {
    console.log('showPopup:', data)
    // Round value to one decimal place
    const roundedData = {
        ...data,
        value: Math.round(data.value * 10) / 10
    };
    // Only proceed if value is not null
    modalData.value = roundedData;
    isModalOpen.value = true;
}

const closeModal = () => {
    isModalOpen.value = false;
    modalData.value = null;
}

const setOnGround = () => {
    if (modalData.value) {
        console.log(`Setting ${modalData.value.name} as ground level:`, modalData.value.value, modalData.value.unit);

        // Here you would implement the actual ground level setting logic
        // For example, if it's elevation, you might want to:
        // - Set a ground reference value
        // - Update altitude calculations
        // - Store the reference in persistent storage

        // Example implementation:
        if (modalData.value.name === 'elevation') {
            // Set ground reference logic here
            console.log('Ground elevation set to:', modalData.value.value);
            // You might want to emit an event or update a global state
            elevationAtTakeoff.value.value = elevation.value;
            altitudeAtTakeoff.value.value = ekfAltitudeISA.value;
        }

        // Close the modal after action
        closeModal();
    }
}

</script>

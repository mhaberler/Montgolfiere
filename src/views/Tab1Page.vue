<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Dashboard</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content :fullscreen="true">
            <div class="bg-white shadow-1xl rounded-1xl">
                <div class=" grid grid-cols-4 grid-rows-5 gap-1 ">
                    <ValueCard name=" GPS" :value="location?.coords?.altitude" unit="m" :decimals="0" />
                    <ValueCard :value="ekfAltitudeQNH" :name="'altQNH'" :decimals="0" :unit="'m'" />

                    <ValueCard name="speed" :value="formatSpeed(location?.coords?.speed)" :decimals="0" unit="km/h" />
                    <ValueCard name="heading" :value="formatHeading(location?.coords?.speed, location?.coords?.heading)"
                        :decimals="0" unit="°" />

                    <div>
                        <ValueCard :value="ekfVelocity" :name="'vSpeed'" :decimals="1" :unit="'m/s'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfAcceleration" :name="'vAccel'" :decimals="2" :unit="'m/s\u00B2'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfZeroSpeedAltitude" :name="'Level'" :decimals="0" :unit="'m'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfTimeToZeroSpeed" :name="'in'" :decimals="0" :unit="'s'" />
                    </div>





                    <div class="row-span-3 col-span-1 -translate-x-6 text-xs w-full  h-50 pl-2">
                        <LinearScale :value="ekfVelocity" :orientation="'vertical'" :scalePadding="15"
                            :indicatorSize="20" :confidenceBoxCrossDimension="10" :confidenceLower="vspeedCI95.lower"
                            :confidenceUpper="vspeedCI95.upper" :transitionDuration="0.95" :majorTicks="vsiMajorTicks"
                            :minorTicks="vsiMinorTicks" :intermediateTicks="vsiIntermediateTicks" :weights="vsiWeights"
                            :majorTickTextOffset="vsiMajorTickTextOffset" :indicatorDistancePercent="22"
                            :confidenceColor="confidenceColor" :confidenceOpacity="0.8" />
                    </div>
                    <div class="row-span-3 col-span-1 -translate-x-6 text-xs w-full  h-50">
                        <LinearScale :value="ekfAcceleration" :orientation="'vertical'" :scalePadding="15"
                            :indicatorSize="20" :confidenceBoxCrossDimension="10" :transitionDuration="0.95"
                            :majorTicks="vaccMajorTicks" :minorTicks="vaccMinorTicks"
                            :intermediateTicks="vaccIntermediateTicks" :weights="vaccWeights"
                            :majorTickTextOffset="vaccMajorTickTextOffset" :indicatorDistancePercent="22"
                            :confidenceLower="vaccelCI95.lower" :confidenceUpper="vaccelCI95.upper"
                            :confidenceColor="confidenceColor" :confidenceOpacity="0.8" />
                    </div>
                    <div>
                        <ValueCard :value="elevation" :name="'elevation'" :decimals="1" :unit="'m'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfAltitudeISA" :name="'altISA'" :decimals="0" :unit="'m'" />
                    </div>
                </div>
                <div class="h-100 overflow-y-auto overflow-x-hidden">
                    <div class=" bg-white p-2 sm:p-6">
                        <EnvelopeUnit @assign-device="goToDeviceAssignment" />
                        <OATUnit @assign-device="goToDeviceAssignment" />
                        <TankUnit unit-type="Tank1" @assign-device="goToDeviceAssignment" />
                        <TankUnit unit-type="Tank2" @assign-device="goToDeviceAssignment" />
                        <TankUnit unit-type="Tank3" @assign-device="goToDeviceAssignment" />
                        <BoxUnit unit-type="Box" @assign-device="goToDeviceAssignment" />
                    </div>
                </div>
            </div>
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
    IonCol, IonGrid, IonRow, IonText

} from '@ionic/vue';
import { useRouter } from 'vue-router';
import { ticker } from '../utils/state';
import { ref } from 'vue';

import ValueCard from '../components/ValueCard.vue';
import LinearScale from '../components/LinearScale.vue';

const confidenceColor = ref('#0de732');
// const confidenceColor = ref('blue');


const vsiMajorTicks = ref([-10, -5, -1, 0, 1, 5, 10]);
const vsiMinorTicks = ref([-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1,
    0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9
]);
const vsiIntermediateTicks = ref([-9, -8, -7, -6, -4, -3, -2, -0.5, 0.5, 2, 3, 4, 6, 7, 8, 9]);
const vsiWeights = ref([0.1, 0.15, 0.25, 0.25, 0.15, 0.1]); // Must sum to ~1.0 and match segments
const vsiMajorTickTextOffset = ref(5)


const vaccMajorTicks = ref([-1.0, -0.5, -0.1, 0, 0.1, 0.5, 1.0]);
const vaccMinorTicks = ref([-0.09, -0.08, -0.07, -0.06, -0.04, -0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.04, 0.06, 0.07, 0.08, 0.09
]);
const vaccIntermediateTicks = ref([-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1, -0.05, 0.05, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
const vaccWeights = ref([0.1, 0.15, 0.25, 0.25, 0.15, 0.1]); // Must sum to ~1.0 and match segments
const vaccMajorTickTextOffset = ref(5)

import EnvelopeUnit from '@/components/units/EnvelopeUnit.vue';
import OATUnit from '@/components/units/OATUnit.vue';
import TankUnit from '@/components/units/TankUnit.vue';
import BoxUnit from '@/components/units/BoxUnit.vue';
import {
    locationAvailable,
    location,
    elevation,
    // locationError,
    // barometerAvailable,
    ekfAltitudeISA,
    ekfAltitudeQNH,
    ekfVelocity,
    ekfAcceleration,
    ekfIsDecelerating,
    ekfTimeToZeroSpeed,
    ekfZeroSpeedAltitude,
    ekfZeroSpeedValid,
    vspeedCI95,
    vaccelCI95,
} from '../utils/state';

const router = useRouter();

const goToDeviceAssignment = () => {
    router.push('/tabs/tab2');
};

function formatHeading(speed: number | null | undefined, heading: number | null | undefined) {
    if (speed === null || speed === undefined || isNaN(speed) || speed < 1) {
        return '--'
    }
    if (heading === null || heading === undefined || isNaN(heading)) {
        return '--'
    }
    return heading
}

function formatSpeed(speed: number | null | undefined) {
    if (speed === null || speed === undefined || isNaN(speed) || speed < 1) {
        return '--'
    }    // Convert from m/s to km/h if needed, or just round
    return Math.round(speed * 3.6)
}
</script>

<style scoped>
/* No custom CSS needed as Tailwind handles all styling */
</style>

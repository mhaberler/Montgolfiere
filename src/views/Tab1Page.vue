<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Dashboard</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content :fullscreen="true">
            <div>
                <div v-if="locationAvailable">

                    <div class=" bg-white p-0 sm:p-6">
                        <div
                            class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 xl:gap-4 mx-auto">
                            <ValueCard name="GPS alt" :value="location?.coords?.altitude" unit="m" :decimals="0" />
                            <ValueCard name="speed" :value="formatSpeed(location?.coords?.speed)" :decimals="0"
                                unit="km/h" />
                            <ValueCard name="heading"
                                :value="formatHeading(location?.coords?.speed, location?.coords?.heading)" :decimals="0"
                                unit="°" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-white">
                <div class="grid grid-cols-4 grid-rows-3 gap-1 	">
                    <div class="row-span-3">
                        <ResponsiveLinearGauge :value="ekfVelocity" :minvalue="-5" :maxvalue="5" :rangeticks="10"
                            :title="'Vspeed'" />
                    </div>
                    <div class="row-span-3">
                        <ResponsiveLinearGauge :value="ekfAcceleration * 1000" :minvalue="-300" :maxvalue="300"
                            :rangeticks="5" :title="'Vaccel'" />
                    </div>

                    <div>
                        <ValueCard :value="ekfAltitudeISA" :name="'altISA'" :decimals="0" :unit="'m'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfVelocity" :name="'vSpeed'" :decimals="1" :unit="'m/s'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfAcceleration * 1000" :name="'vAccel'" :decimals="0" :unit="'mm/s2'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfZeroSpeedAltitude * 1000" :name="'Level'" :decimals="0" :unit="'m'" />
                    </div>
                    <div>
                        <ValueCard :value="ekfTimeToZeroSpeed" :name="'in'" :decimals="0" :unit="'s'" />
                    </div>
                </div>
                <div>
                </div>
                <div class=" bg-white p-2 sm:p-6">
                    <EnvelopeUnit @assign-device="goToDeviceAssignment" />
                    <OATUnit @assign-device="goToDeviceAssignment" />
                    <TankUnit unit-type="Tank1" @assign-device="goToDeviceAssignment" />
                    <TankUnit unit-type="Tank2" @assign-device="goToDeviceAssignment" />
                    <TankUnit unit-type="Tank3" @assign-device="goToDeviceAssignment" />
                    <BoxUnit unit-type="Box" @assign-device="goToDeviceAssignment" />
                    <!-- <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 xl:gap-4 mx-auto">
                        <ValueCard v-for="(card, index) in cardData" :key="index" :value="card.value" :name="card.name"
                            :decimals="card?.decimals" :unit="card.unit" :batteryStatus="card.batteryStatus"
                            :frameClass="card.frameClass" />
                    </div>
                    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 xl:gap-4 mx-auto">
                        <ValueCard v-for="(card, index) in cardData" :key="index" :value="card.value" :name="card.name"
                            :decimals="card?.decimals" :unit="card.unit" :batteryStatus="card.batteryStatus"
                            :frameClass="card.frameClass" />
                    </div> -->

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
import ValueCard from '../components/ValueCard.vue';
// import LinearGauge from '../gauges/LinearGauge.vue';
// import RadialGauge from '../gauges/RadialGauge.vue';
// import TemperatureGauge from '../gauges/TemperatureGauge.vue'
// import VarioGauge from '../gauges/VarioGauge.vue'
// import SingleLinear from '../gauges/SingleLinear.vue'
import ResponsiveLinearGauge from '../gauges/ResponsiveLinearGauge.vue'
import EnvelopeUnit from '@/components/units/EnvelopeUnit.vue';
import OATUnit from '@/components/units/OATUnit.vue';
import TankUnit from '@/components/units/TankUnit.vue';
import BoxUnit from '@/components/units/BoxUnit.vue';
import {
    locationAvailable,
    location,
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
// Define the data for the 6 ValueCard instances
// const cardData = [
//     {
//         value: 42,
//         name: 'VSPEED',
//         unit: 'm/S',
//         decimals: 1,

//         // batteryStatus: 85,
//         frameClass: ''
//     },
//     {
//         value: '60%',
//         name: 'Hum',
//         unit: 'Rel',
//         batteryStatus: 33,
//         frameClass: '' // 'border-2 border-blue-400'
//     },
//     {
//         value: '1012.3',
//         name: 'Pres',
//         unit: 'hPa',
//         batteryStatus: 61,
//         frameClass: ''
//     },
//     {
//         value: 7.1234,
//         name: 'Water',
//         unit: 'pH',
//         decimals: 1,
//         batteryStatus: 85,
//         frameClass: '' // 'border-2 border-red-400'
//     },
//     {
//         value: '300',
//         name: 'CO2',
//         unit: 'ppm',
//         batteryStatus: 75,
//         frameClass: ''
//     },
//     {
//         value: 3.1415,
//         name: 'Light',
//         unit: 'Lux',
//         decimals: 4,
//         batteryStatus: null,
//         frameClass: ''
//     }
// ];
</script>

<style scoped>
/* No custom CSS needed as Tailwind handles all styling */
</style>

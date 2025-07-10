<template>
    <div>
        <ion-card-header>
            <ion-card-subtitle>Baro</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
            <div v-if="barometerAvailable">
                <ion-grid class="sensor-grid">
                    <ion-row>
                        <ion-col size="4" class="sensor-col">
                            <SensorDisplay name="alt qnh" :value="ekfAltitudeQNH" unit="m" :decimals="0" />
                        </ion-col>
                        <ion-col size="4" class="sensor-col">
                            <SensorDisplay name="vspeed" :value="ekfVelocity" unit="m/s" :decimals="1" />
                        </ion-col>
                        <ion-col size="4" class="sensor-col">
                            <SensorDisplay name="accel" :value="ekfAcceleration * 1000" unit="mm/s^2" :decimals="0" />
                        </ion-col>
                    </ion-row>

                    <ion-row>
                        <ion-col size="6" class="sensor-col">
                            <SensorDisplay name="leveloff at" :value="levelOffMeters(ekfIsDecelerating,
                                ekfTimeToZeroSpeed,
                                ekfZeroSpeedAltitude,
                                ekfZeroSpeedValid,
                                ekfAltitudeISA)" unit="m" :decimals="0" />
                        </ion-col>
                        <ion-col size="6" class="sensor-col">
                            <SensorDisplay name="leveloff in" :value="levelOffSeconds" unit="s" :decimals="0" />
                        </ion-col>
                    </ion-row>

                </ion-grid>
            </div>
            <!-- <div v-else class="no-data">
                <ion-text color="medium">barometer unavailable </ion-text>
            </div> -->
        </ion-card-content>
    </div>
</template>


<script setup lang="ts">

import SensorDisplay from '@/components/SensorDisplay.vue'
import { computed } from 'vue'

import {

    IonCardHeader,
    IonCardContent,
    IonCardSubtitle,
    IonCol, IonGrid, IonRow
} from '@ionic/vue';

import {

    barometerAvailable,
    ekfAltitudeISA,
    ekfAltitudeQNH,
    ekfVelocity,
    ekfAcceleration,
    ekfIsDecelerating,
    ekfTimeToZeroSpeed,
    ekfZeroSpeedAltitude,
    ekfZeroSpeedValid,
} from '../utils/state';

// import { LinearGauge, RadialGauge } from '@/gauges/vue-canvas-gauges'


function levelOffMeters(
    isDecelerating: boolean,
    timeToZeroSpeed: number | null,
    zeroSpeedAltitude: number | null,
    zeroSpeedValid: boolean,
    ekfAltitudeISA: number | null
) {
    if (
        !isDecelerating ||
        !zeroSpeedValid ||
        timeToZeroSpeed === null ||
        zeroSpeedAltitude === null ||
        ekfAltitudeISA === null
    ) {
        return '--'
    }
    return zeroSpeedAltitude - ekfAltitudeISA
}
const levelOffSeconds = computed(() => {
    if (!ekfIsDecelerating.value || ekfTimeToZeroSpeed.value === null) {
        return '--'
    }
    return ekfTimeToZeroSpeed.value
})


</script>



<style scoped>
.location-container {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.location-container {
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

ion-card {
    width: 100%;
    max-width: 400px;
}


.sensor-container {
    /* padding: 0px; */
    display: flex;
    flex-direction: column;
    /* align-items: center; */
    gap: 0px;
    margin-top: 1px
}

.sensor-col {
    /* padding: 0px; */
}

.sensor-status h2 {
    text-align: center;
    font-size: 1.2rem;
    font-weight: 500;
}

.sensor-reading {
    text-align: center;
}

.sensor-reading h3 {
    color: var(--ion-color-medium);
    font-size: 1rem;
    margin-bottom: 0.5rem;
}

.reading-value {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
}

.unit {
    font-size: 1rem;
    color: var(--ion-color-medium);
}

.framed-text {
    border: 2px solid;
    padding: 10px;
}

.text-frame {
    border: 2px solid;
    padding: 10px;
    display: inline-block;
}
</style>

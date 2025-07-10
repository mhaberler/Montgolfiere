<template>
    <div>
        <ion-card-header>
            <ion-card-subtitle>GPS</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
            <div v-if="locationAvailable">
                <ion-grid class="sensor-grid">
                    <ion-row>
                        <ion-col size="4" class="sensor-col">
                            <ValueCard name="GPS alt" :value="location?.coords?.altitude" unit="m" :decimals="0" />
                        </ion-col>
                        <ion-col size="4" class="sensor-col" v-if="true">
                            <ValueCard name="speed" :value="formatSpeed(location?.coords?.speed)" :decimals="0"
                                unit="km/h" />
                        </ion-col>
                        <ion-col size="4" class="sensor-col">
                            <ValueCard name="heading"
                                :value="formatHeading(location?.coords?.speed, location?.coords?.heading)" :decimals="0"
                                unit="°" />
                        </ion-col>
                    </ion-row>
                </ion-grid>
            </div>
            <div v-else class="no-data">
                <ion-text color="medium">location unavailable {{ locationError }}</ion-text>
            </div>
        </ion-card-content>
    </div>
</template>
<script setup lang="ts">

import SensorDisplay from '@/components/SensorDisplay.vue'
import ValueCard from '@/components/ValueCard.vue';

import {

    IonCardHeader,
    IonCardContent,
    IonCardSubtitle,
    IonCol, IonGrid, IonRow, IonText
} from '@ionic/vue';

import {
    locationAvailable,
    location,
    locationError,

} from '../utils/state';

// import { LinearGauge, RadialGauge } from '@/gauges/vue-canvas-gauges'


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

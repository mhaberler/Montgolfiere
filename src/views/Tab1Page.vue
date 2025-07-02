<template>
  <ion-page>
    <!-- <ion-header>
      <ion-toolbar>
        <ion-title>Status</ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-content :fullscreen="true">
      <ion-card class="sensor-container">
        <ion-card-header>
          <!-- <ion-card-title>Current Location</ion-card-title> -->
          <ion-card-subtitle>GPS</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>

          <ion-grid class="sensor-grid" v-if="location">
            <ion-row>
              <ion-col size="4" class="sensor-col">
                <SensorDisplay name="GPS alt" :value="location?.coords?.altitude" unit="m" :decimals="0" />
              </ion-col>
              <ion-col size="4" class="sensor-col" v-if="true">
                <SensorDisplay name="speed" :value="formatSpeed(location?.coords?.speed)" :decimals="0" unit="km/h" />
              </ion-col>
              <ion-col size="4" class="sensor-col">
                <SensorDisplay name="heading" :value="formatHeading(location?.coords?.speed, location?.coords?.heading)"
                  :decimals="0" unit="°" />
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <ion-card class="sensor-container" v-if="barometerAvailable">
        <ion-card-header>
          <ion-card-subtitle>Baro</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>

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
        </ion-card-content>
      </ion-card>



      <!-- <ion-card class="sensor-container" v-if="showDebugInfo">
        <ion-card-header> -->
      <!-- <ion-card-title>Current Location</ion-card-title> -->
      <!-- <ion-card-subtitle>Debug info</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <ion-content :fullscreen="true">
          <DebugEkf></DebugEkf>
        </ion-content>
      </ion-card-content>
      </ion-card> -->

      <DebugEkf></DebugEkf>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">

import SensorDisplay from '@/components/SensorDisplay.vue'
import DebugEkf from '@/components/DebugEkf.vue';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  // IonButton,
  IonCard,
  IonCardHeader,
  // IonCardTitle,
  IonCardContent,
  IonCardSubtitle,
  // IonText,
  IonCol, IonGrid, IonRow
} from '@ionic/vue';

import {
  // locationAvailable,
  location,
  // locationError,
  // pressureQNH,
  // pressure,
  // altitudeQNH,
  // altitudeISA,
  barometerAvailable,

  ekfAltitudeISA,
  ekfAltitudeQNH,
  ekfVelocity,
  ekfAcceleration,
  ekfBurnerGain,
  ekfIsDecelerating,
  ekfTimeToZeroSpeed,
  ekfZeroSpeedAltitude,
  ekfZeroSpeedValid,
  showDebugInfo
} from '../utils/state';

// import { LinearGauge, RadialGauge } from '@/gauges/vue-canvas-gauges'

function formatHeading(speed: number | null, heading: number | null) {
  if (speed === null || speed < 1 || heading === null) {
    return '--'
  }
  return heading
}

function formatSpeed(speed: number | null) {
  if (speed === null || isNaN(speed) || speed < 0) return '--'
  // Convert from m/s to km/h if needed, or just round
  return Math.round(speed * 3.6)
}


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


import { computed } from 'vue'

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

ion-card {
  width: 100%;
  max-width: 400px;
}

/* 
.sensor-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
} */

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
  /* Add some padding to separate text from the border */
}

.text-frame {
  border: 2px solid;
  /* dashed blue; /* Example: dashed blue border */
  padding: 10px;
  display: inline-block;
  /* Important to make the container fit the content */
}
</style>

<!-- <script lang="ts">
declare module '.vue' {
  import { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
</script> -->










<!-- <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Status</ion-title>
        </ion-toolbar>
      </ion-header> -->

<!-- <div class="location-container"> -->
<!-- <ion-text class="sensor-status" :color="locationAvailable ? 'success' : 'medium'">
          <h2>Geolocation: {{ locationAvailable ? 'Available' : 'Not Available' }}</h2>
        </ion-text> -->

<!--
        <ion-card v-if="location">
          <ion-card-header>
            <ion-card-title>Current Location</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Latitude: {{ location.coords.latitude.toFixed(6) }}</p>
            <p>Longitude: {{ location.coords.longitude.toFixed(6) }}</p>
            <p>GPS Altitude: {{ location.coords.altitude ? location.coords.altitude.toFixed(1) : "--" }}</p>
            <p v-if="location.coords.accuracy">Accuracy: ±{{ location.coords.accuracy.toFixed(1) }}m</p>
          </ion-card-content>
        </ion-card>

        <ion-text color="danger" v-if="locationError">
          {{ locationError }}
        </ion-text>
      </div> -->

<!-- <div class="sensor-container text-frame"> -->

<!-- <ion-text class="sensor-status" :color="baroActive ? 'success' : 'medium'">
          <h2>Barometer Sensor: {{ baroActive ? 'Available' : 'Not Available' }}</h2>
        </ion-text> -->

<!-- <ion-text class="sensor-reading ">
          <p class="reading-value">{{ pressure.toFixed(2) }}</p> -->

<!-- <span class="unit">hPa</span></p> -->

<!-- <h3>Pressure hPa</h3>
        </ion-text> -->







<!-- <div class="sensor-container text-frame"> -->

<!-- <ion-text class="sensor-status" :color="baroActive ? 'success' : 'medium'">
          <h2>Barometer Sensor: {{ baroActive ? 'Available' : 'Not Available' }}</h2>
        </ion-text> -->

<!-- <ion-text class="sensor-reading ">
          <p class="reading-value">{{ pressure.toFixed(2) }}</p> -->

<!-- <span class="unit">hPa</span></p> -->

<!-- <h3>Pressure hPa</h3>
        </ion-text> -->







<!-- <div>
        <linear-gauge :value="377"></linear-gauge>
        <radial-gauge :options="{ value: 233 }"></radial-gauge>
      </div>
       -->


<!-- <ion-card v-if="location"> -->
<!-- <ion-card>
                <ion-card-header>
                  <ion-card-title>Current Location</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <p>Latitude: {{ location ? location.coords.latitude.toFixed(6) : "--" }}</p>
                  <p>Longitude: {{ location ? location.coords.longitude.toFixed(6) : "--" }}</p>
                </ion-card-content>
              </ion-card> -->
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Status</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" v-if="showDebugInfo">

      <ion-card class="sensor-container">
        <ion-card-header>
          <!-- <ion-card-title>Current Location</ion-card-title> -->
          <ion-card-subtitle>Motion</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-grid class="sensor-grid" v-if="true">
            <ion-row>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="GPS alt" :value="location ? location.coords.altitude : '--'" unit="m"
                  :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col" v-if="true">
                <SensorDisplay name="speed" :value="location ? location.coords.speed : '--'" :decimals="0" unit="km/h"
                  color="#dc2626" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="heading" :value="location ? location.coords.heading : '--'" :decimals="0"
                  unit="°" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="Pressure" :value="pressure ? pressure.toFixed(0) : '--'" unit="hPa"
                  :decimals="0" />
              </ion-col>
            </ion-row>

            <ion-row>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="GPS alt" :value="220.25" unit="m" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="speed" :value="18.2" unit="km/h" :decimals="0" color="#dc2626" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="heading" :value="280" unit="°" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="Pressure" :value="1013.25" unit="hPa" :decimals="0" />
              </ion-col>
            </ion-row>


            <ion-row>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="GPS alt" :value="220.25" unit="m" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="speed" :value="18.2" unit="km/h" :decimals="0" color="#dc2626" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="heading" :value="280" unit="°" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="Pressure" :value="1013.25" unit="hPa" :decimals="0" />
              </ion-col>
            </ion-row>

          </ion-grid>
        </ion-card-content>
      </ion-card>

      <ion-card class="sensor-container" v-if="true">
        <ion-card-header>
          <!-- <ion-card-title>Current Location</ion-card-title> -->
          <ion-card-subtitle>Fuel</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="GPS alt" :value="220.25" unit="m" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="speed" :value="18.2" unit="km/h" :decimals="0" color="#dc2626" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="heading" :value="280" unit="°" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="Pressure" :value="1013.25" unit="hPa" :decimals="0" />
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>



      <ion-card class="sensor-container">
        <ion-card-header>
          <!-- <ion-card-title>Current Location</ion-card-title> -->
          <ion-card-subtitle>Fuel</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="GPS alt" :value="220.25" unit="m" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="speed" :value="18.2" unit="km/h" :decimals="0" color="#dc2626" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="heading" :value="280" unit="°" :decimals="0" />
              </ion-col>
              <ion-col size="3" class="sensor-col">
                <SensorDisplay name="Pressure" :value="1013.25" unit="hPa" :decimals="0" />
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>

      <!-- <ion-card class="sensor-container">
      <ion-card-header>
        <ion-card-subtitle>Fuel</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <ion-grid>
          <ion-row>
            <ion-col size="3" class="sensor-col">
              <SensorDisplay name="GPS alt" :value="220.25" unit="m" :decimals="0" />
            </ion-col>
            <ion-col size="3" class="sensor-col">
              <SensorDisplay name="speed" :value="18.2" unit="km/h" :decimals="0" color="#dc2626" />
            </ion-col>
            <ion-col size="3" class="sensor-col">
              <SensorDisplay name="heading" :value="280" unit="°" :decimals="0" />
            </ion-col>
            <ion-col size="3" class="sensor-col">
              <SensorDisplay name="Pressure" :value="1013.25" unit="hPa" :decimals="0" />
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card> -->

    </ion-content>

    <!-- Show message when not in debug mode -->
    <ion-content :fullscreen="true" v-if="!showDebugInfo">
      <ion-card>
        <ion-card-content>
          <p>Status page is only available in development mode.</p>
        </ion-card-content>
      </ion-card>
    </ion-content>

  </ion-page>
</template>


<script setup>
import SensorDisplay from '@/components/SensorDisplay.vue'

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  // IonContent,
  // IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonContent,
  // IonText,
  IonCol, IonGrid, IonRow
} from '@ionic/vue';


import {
  locationAvailable, location, locationError,
  referencePressure,
  useReferencePressure,
  pressure,
  altitudeQNH,
  altitudeISA,
  barometerAvailable,
  ekfAltitude,
  ekfVelocity,
  ekfAcceleration,
  ekfBurnerGain,
  ekfIsDecelerating,
  ekfTimeToZeroSpeed,
  ekfZeroSpeedAltitude,
  ekfZeroSpeedValid
} from '../utils/state';

const showDebugInfo = import.meta.env.MODE === 'development';

// const handleSensorClick = (sensorData) => {
//   console.log('Sensor clicked:', sensorData)
// }
</script>

<style scoped>
.sensor-grid {
  /* gap: 5px; */
}

.sensor-col {
  padding: 0px;
}

.sensor-container {
  /* padding: 0px; */
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  gap: 0px;
  margin-top: 1px
}
</style>
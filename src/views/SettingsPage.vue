<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-card>
        <div class="bg-white ">

          <ion-card-header>
            <ion-card-title>Configuration</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="grid grid-cols-2  gap-1 ">
              <div>
                <ion-label>QNH (hPa)</ion-label>
              </div>
              <div>
                <ion-input type="number" min="800" max="1100" step="1" v-model.number="pressureQNH"></ion-input>
              </div>
              <div>
                <ion-label>Transition alt (ft)</ion-label>
              </div>
              <div>
                <ion-input type="number" min="0" max="12000" step="1000"
                  v-model.number="transitionAltitude"></ion-input>
              </div>
              <div>
                <ion-label>Variance samples</ion-label>
              </div>
              <div>
                <ion-input type="number" min="5" max="100" v-model.number="historySamples" @ionBlur="() => {
                  if (historySamples < 5) historySamples = 5;
                  if (historySamples > 500) historySamples = 500;
                }"></ion-input>
              </div>
              <div>
                <ion-label>Show Debug Info</ion-label>
              </div>
              <div>
                <ion-button fill="outline" size="small" @click="toggleDebugInfo">
                  {{ showDebugInfo ? 'Hide' : 'Show' }}
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </div>

      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Sensor source</ion-card-title>
          <!-- <ion-card-subtitle>Card Subtitle</ion-card-subtitle> -->
        </ion-card-header>

        <ion-card-content>
          <div class="select-container">
            <ion-select v-model="sensorSource" placeholder="Select sensor source" interface="popover"
              class="sensor-select">
              <ion-select-option v-for="option in sensorSourceOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </ion-select-option>
            </ion-select>
          </div>
        </ion-card-content>
      </ion-card>

      <DebugEkf></DebugEkf>

      <ion-card v-if="false">
        <ion-card-header>
          <ion-card-title>MQTT Broker Settings</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="config-grid">
            <div class="config-item">
              <ion-label>Broker URL</ion-label>
              <ion-input v-model="mqttBrokerUrl"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>User</ion-label>
              <ion-input v-model="mqttUser"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Password</ion-label>
              <ion-input type="password" v-model="mqttPassword"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Connection Status</ion-label>
              <!-- [color]="mqttStatusColor" -->
              <ion-text>{{ mqttStatusMsg }}</ion-text>
            </div>
            <div class="config-item">
              <ion-button expand="full" @click="checkMqttConnection">
                Check Connection
              </ion-button>
            </div>
          </div>


        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>

</template>

<script setup lang="ts">

import {
  IonPage, IonContent, IonLabel, IonToggle, IonInput, IonCard,
  IonCardHeader, IonCardTitle, IonCardContent, IonButton,
  IonSelect, IonSelectOption, IonText, IonHeader, IonTitle, IonToolbar
} from '@ionic/vue';
import DebugEkf from '@/components/DebugEkf.vue';
import { computed, ref, watch } from 'vue';
import { mqttBrokerUrl, mqttUser, mqttPassword } from '@/utils/mqtt';
import mqtt from 'mqtt';


import {
  pressureQNH,
  transitionAltitude,
  historySamples,
  showDebugInfo,
  sensorSource,
  isNativePlatform
} from '@/utils/state';


const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};


// Get sensor source options based on platform
const sensorSourceOptions = computed(() => {
  const options = [
    { value: 'simulated', label: 'Simulated' },
    // { value: 'mqtt', label: 'MQTT' },
    // { value: 'logfile', label: 'Log file' }
  ];

  // Only add hardware option on native platforms
  if (isNativePlatform.value) {
    options.unshift({ value: 'native', label: 'Hardware' });
  }

  return options;
});



// MQTT connection state
// const mqttConnecting = ref(false);
// const mqttConnected = ref(false);
// const mqttState = ref < String > <'idle' | 'connecting' | 'success' | 'error'>('idle');

const mqttState = ref<string>('idle');
const mqttStatusMsg = ref<string>('');

const checkMqttConnection = async () => {
  mqttState.value = 'connecting';
  mqttStatusMsg.value = '';
  try {
    const client = mqtt.connect(mqttBrokerUrl.value, {
      username: mqttUser.value || undefined,
      password: mqttPassword.value || undefined,
      connectTimeout: 4000,
      reconnectPeriod: 0,
    });
    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        mqttState.value = 'success';
        mqttStatusMsg.value = 'Connected!';
        client.end();
        resolve();
      });
      client.on('error', (err) => {
        mqttState.value = 'error';
        mqttStatusMsg.value = 'Connection failed: ' + err.message;
        client.end();
        reject(err);
      });
      setTimeout(() => {
        if (mqttState.value === 'connecting') {
          mqttState.value = 'error';
          mqttStatusMsg.value = 'Connection timed out.';
          client.end();
          reject(new Error('Timeout'));
        }
      }, 4000);
    });
  } catch (e: any) {
    if (mqttState.value !== 'error') {
      mqttState.value = 'error';
      mqttStatusMsg.value = 'Connection failed: ' + (e?.message || e);
    }
  }
};

const mqttStatusColor = computed(() => {
  switch (mqttState.value) {
    case 'success':
      return 'success';
    case 'error':
      return 'danger';
    default:
      return 'medium';
  }
});
</script>

<style scoped>
/* all tailwind */
</style>
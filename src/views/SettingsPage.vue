<template>
  <ion-page>
    <!-- <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-content :fullscreen="true">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Configuration</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="config-grid">
            <div class="config-item">
              <ion-label>QNH (hPa)</ion-label>
              <ion-input type="number" min="800" max="1100" step="1" v-model.number="pressureQNH"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Transition alt (ft)</ion-label>
              <ion-input type="number" min="0" max="12000" step="1000" v-model.number="transitionAltitude"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Variance samples</ion-label>
              <ion-input type="number" min="5" max="100" v-model.number="historySamples" @ionBlur="() => {
                if (historySamples < 5) historySamples = 5;
                if (historySamples > 500) historySamples = 500;
              }"></ion-input>
            </div>
            <div class="config-item">
              <ion-label>Show Debug Info</ion-label>
              <ion-button fill="outline" size="small" @click="toggleDebugInfo">
                {{ showDebugInfo ? 'Hide' : 'Show' }}
              </ion-button>
            </div>
          </div>
        </ion-card-content>

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
  IonSelect, IonSelectOption, IonText
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { mqttBrokerUrl, mqttUser, mqttPassword } from '@/utils/mqtt';
import mqtt from 'mqtt';
import { Capacitor } from '@capacitor/core';


import {
  pressureQNH,
  transitionAltitude,
  historySamples,
  showDebugInfo,
  sensorSource,
} from '@/utils/state';


const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};

const isNativePlatform = computed(() => {
  return Capacitor.isNativePlatform()
});

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
ion-content {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

ion-card {
  margin-bottom: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

ion-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

ion-card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 16px 20px;
}

ion-card-title {
  font-size: 1.4rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

ion-card-content {
  padding: 0;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

ion-input {
  --background: rgba(255, 255, 255, 0.8);
  --border-radius: 8px;
  --padding-start: 12px;
  --padding-end: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

ion-input:focus-within {
  /* --background: rgba(255, 255, 255, 1); */
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

ion-toggle {
  --background: #e0e0e0;
  --background-checked: #667eea;
  --handle-background: white;
  --handle-background-checked: white;
  --handle-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

ion-toggle:hover {
  transform: scale(1.05);
}

ion-button {
  --background: rgba(102, 126, 234, 0.1);
  --color: #667eea;
  --border-color: #667eea;
  --border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

ion-button:hover {
  --background: #667eea;
  --color: white;
  transform: scale(1.05);
}

/* Sensor select dropdown styling */
.select-container {
  padding: 16px;
}

.sensor-select {
  --background: rgba(255, 255, 255, 0.95);
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #2c3e50;
  width: 100%;
}

.sensor-select:focus-within {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.sensor-select:hover {
  --background: rgba(255, 255, 255, 1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Configuration grid styling */
.config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  min-height: 44px;
}

.config-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.config-item ion-label {
  margin: 0;
  font-weight: 500;
  color: #2c3e50;
  font-size: 1rem;
  min-width: 200px;
  flex: 0 0 200px;
  white-space: nowrap;
}

.config-item ion-input {
  flex: 1;
  max-width: 200px;
}

.config-item ion-toggle {
  margin: 0;
}

.config-item ion-button {
  margin: 0;
  flex-shrink: 0;
}


/* Dark mode support */
@media (prefers-color-scheme: dark) {
  ion-content {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  }

  ion-card {
    background: rgba(52, 73, 94, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }

  ion-input {
    --background: rgba(44, 62, 80, 0.8);
    --color: #ecf0f1;
  }

  .sensor-select {
    --background: rgba(52, 73, 94, 0.8);
    color: #ecf0f1;
  }

  .sensor-select:hover {
    --background: rgba(52, 73, 94, 1);
    border-color: rgba(102, 126, 234, 0.5);
  }

  .config-item {
    background: rgba(52, 73, 94, 0.8);
  }

  .config-item:hover {
    background: rgba(52, 73, 94, 1);
    border-color: rgba(102, 126, 234, 0.5);
  }

  .config-item ion-label {
    color: #ecf0f1;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  ion-content {
    padding: 12px;
  }

  ion-card {
    margin-bottom: 16px;
    border-radius: 12px;
  }

  ion-card-header {
    padding: 16px;
    border-radius: 12px 12px 0 0;
  }

  ion-card-title {
    font-size: 1.2rem;
  }

  .select-container {
    padding: 12px;
  }

  .config-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 12px;
  }

  .config-item ion-label {
    min-width: auto;
    flex: none;
    font-size: 0.9rem;
    text-align: left;
  }

  .config-item ion-input {
    max-width: none;
  }
}
</style>
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>MQTT/MQTT-WS mDNS Scanner</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Controls</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="controls-grid">
            <ion-input v-model="manualHost" placeholder="Enter MQTT broker IP" fill="outline" label="Host"
              label-placement="stacked"></ion-input>

            <ion-input v-model="manualPort" placeholder="Port (1883)" type="number" fill="outline" label="Port"
              label-placement="stacked"></ion-input>

            <ion-select v-model="selectedType" fill="outline" label="Type" label-placement="stacked"
              interface="popover">
              <ion-select-option value="_mqtt-ws._tcp.">MQTT WebSocket</ion-select-option>
              <ion-select-option value="_mqtt-wss._tcp.">MQTT WSS</ion-select-option>
            </ion-select>

            <div class="button-group">
              <ion-button @click="addManualService" expand="block" color="success">
                Add Manual
              </ion-button>

              <ion-button @click="toggleScan" expand="block" :color="isScanning ? 'danger' : 'primary'"
                :disabled="!isCapacitorApp">
                {{ isScanning ? 'Stop Scan' : 'Start Scan' }}
              </ion-button>
            </div>
          </div>

          <ion-text v-if="!isCapacitorApp" color="warning" class="warning-text">
            <p>mDNS scanning is only available in the Capacitor app</p>
          </ion-text>

          <ion-text v-if="scanError" color="danger" class="error-text">
            <p>{{ scanError }}</p>
          </ion-text>
        </ion-card-content>
      </ion-card>

      <div class="services-container">
        <ion-text v-if="Object.keys(services).length === 0" color="medium" class="empty-state">
          <div class="empty-content">
            <p v-if="isCapacitorApp && !isScanning">
              No services found. Click "Start Scan" to discover MQTT brokers on your network, or add a manual broker
              above.
            </p>
            <p v-else-if="isCapacitorApp && isScanning">
              <ion-spinner name="circles"></ion-spinner>
              Scanning for MQTT services... This may take a few moments.
            </p>
            <p v-else>
              No services configured. Add a manual MQTT broker above.
            </p>
            <p class="hint">Common ports: 1883 (MQTT), 8883 (MQTTS), 9001 (WebSocket)</p>
          </div>
        </ion-text>

        <ion-list v-if="Object.keys(services).length > 0">
          <ion-item v-for="(service, key) in services" :key="key" button @click="handleServicePress(service)" :class="{
              'discovered': service.discovered,
              'resolved': service.resolved
            }">
            <ion-label>
              <h2>{{ service.name }}</h2>
              <p>Type: {{ service.type }}</p>
              <p>Host: {{ service.host }}</p>
              <p>Port: {{ service.port }}</p>

              <ion-chip v-if="service.discovered" :color="service.resolved ? 'primary' : 'medium'" size="small">
                {{ service.resolved ? 'Resolved via mDNS' : 'Resolving...' }}
              </ion-chip>

              <p v-if="service.txtRecord && Object.keys(service.txtRecord).length > 0" class="txt-record">
                TXT: {{ JSON.stringify(service.txtRecord) }}
              </p>

              <p class="tap-hint">Tap to connect</p>
            </ion-label>

            <ion-button slot="end" fill="clear" color="danger" size="small" @click.stop="removeService(key)"
              :title="service.discovered ? 'Remove discovered service' : 'Remove manual service'">
              <ion-icon :icon="closeOutline"></ion-icon>
            </ion-button>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Capacitor } from '@capacitor/core';
import { ZeroConf } from '@mhaberler/capacitor-zeroconf-nsd';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonIcon,
  IonSpinner
} from '@ionic/vue';
import { closeOutline } from 'ionicons/icons';

function removeLeadingAndTrailingDots(str: string): string {
  // The regular expression to match leading or trailing dots
  // ^\.* -> Matches zero or more dots at the beginning of the string
  // |      -> OR
  // \.*$   -> Matches zero or more dots at the end of the string
  return str.replace(/^\.+|\.+$/g, '');
}

const router = useRouter();
const services = ref<Record<string, any>>({});
const manualHost = ref('');
const manualPort = ref(import.meta.env.VITE_MQTT_BROKER_PORT || 8883);
const selectedType = ref('_mqtt._tcp');
const isScanning = ref(false);
const isCapacitorApp = ref(Capacitor.isNativePlatform());
const scanError = ref('');

// Service types to scan for
const serviceTypes = [
  // '_mqtt._tcp.',
  '_mqtt-ws._tcp.',
  // '_mqtts._tcp.',
  '_mqtt-wss._tcp.'
];

// test.mosquitto.org
// 1883 : MQTT, unencrypted, unauthenticated
// 1884 : MQTT, unencrypted, authenticated
// 8883 : MQTT, encrypted, unauthenticated
// 8884 : MQTT, encrypted, client certificate required
// 8885 : MQTT, encrypted, authenticated
// 8886 : MQTT, encrypted, unauthenticated
// 8887 : MQTT, encrypted, server certificate deliberately expired
// 8080 : MQTT over WebSockets, unencrypted, unauthenticated
// 8081 : MQTT over WebSockets, encrypted, unauthenticated
// 8090 : MQTT over WebSockets, unencrypted, authenticated
// 8091 : MQTT over WebSockets, encrypted, authenticated

// Add some default services for testing
const defaultServices: Record<string, any> = {
  'test-mosquitto-wss': {
    name: 'test.mosquitto.org (WSS)',
    type: '_mqtt-wss._tcp.',
    host: 'test.mosquitto.org',
    port: 8081,
    discovered: false,
    resolved: true
  }
};

// Only add insecure WebSocket service when not on web platform
if (isCapacitorApp.value) {
  defaultServices['test-mosquitto-ws'] = {
    name: 'test.mosquitto.org (WS)',
    type: '_mqtt-ws._tcp.',
    host: 'test.mosquitto.org',
    port: 8080,
    discovered: false,
    resolved: true
  };
}

services.value = { ...defaultServices };

const addManualService = () => {
  if (manualHost.value && manualPort.value) {
    const key = `manual-${Date.now()}`;
    services.value[key] = {
      name: `Manual MQTT (${manualHost.value}:${manualPort.value})`,
      type: selectedType.value,
      host: manualHost.value,
      port: parseInt(manualPort.value.toString())
    };
    manualHost.value = '';
    manualPort.value = import.meta.env.VITE_MQTT_BROKER_PORT || 8883;
  }
};

const removeService = (key: string) => {
  delete services.value[key];
};

const handleServicePress = (service: any) => {
  // Use query parameters instead of route params for complex objects
  stopScan();
  router.push({
    path: 'mqtt',
    query: {
      name: service.name,
      type: service.type,
      host: service.host,
      port: service.port.toString(),
      discovered: service.discovered ? 'true' : 'false',
      txtRecord: service.txtRecord ? JSON.stringify(service.txtRecord) : undefined
    }
  });
};

const onServiceEvent = (arg: any) => {
  if (!arg) return;

  const { action, service } = arg;
  const st = removeLeadingAndTrailingDots(service.type);
  const key = `${service.name}_${service.domain}_${st}`;
  console.log(`onServiceEvent: ${action}, "${key}", ${JSON.stringify(service, null, 2)}`);

  if (action === 'added') {
    // Insert a basic service object when service is first discovered
    services.value[key] = {
      name: service.name || `${service.type} Service`,
      type: service.type,
      host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0] || 'Unknown',
      port: service.port || 0,
      discovered: true,
      resolved: false
    };
  } else if (action === 'removed') {
    // Delete the service object when it's no longer available
    if (services.value[key]) {
      console.log("remove: key found:", key, services.value[key].discovered);
      if (services.value[key].discovered) {
        delete services.value[key];
      }
    } else {
      console.log("remove: key not found:", key);
    }
  } else if (action === 'resolved' && service.port) {
    // Enhance the existing service object with resolved details
    if (services.value[key]) {
      services.value[key] = {
        ...services.value[key],
        name: service.name || services.value[key].name,
        host: service.hostname || service.ipv4Addresses?.[0] || service.ipv6Addresses?.[0] || services.value[key].host,
        port: service.port || services.value[key].port,
        resolved: true,
        // Add any additional resolved fields
        txtRecord: service.txtRecord || {},
        ipv4Addresses: service.ipv4Addresses || [],
        ipv6Addresses: service.ipv6Addresses || []
      };
    }
  }
};

const startScan = async () => {
  if (!isCapacitorApp.value) {
    console.warn('mDNS scanning is only available in Capacitor apps');
    return;
  }

  try {
    isScanning.value = true;
    scanError.value = '';

    // Start scanning for each service type with callbacks
    for (const serviceType of serviceTypes) {
      await ZeroConf.watch({
        type: serviceType,
        domain: 'local.',
        // addressFamily: 'ipv4'
      }, onServiceEvent);
    }

    console.log('Started mDNS scanning for MQTT services');
  } catch (error: any) {
    console.error('Error starting mDNS scan:', error);
    scanError.value = `Failed to start scan: ${error.message || 'Unknown error'}`;
    isScanning.value = false;
  }
};

const stopScan = async () => {
  if (!isCapacitorApp.value) return;

  try {
    for (const serviceType of serviceTypes) {
      ZeroConf.unwatch({
        type: serviceType,
        domain: 'local.'
      });
    }
    isScanning.value = false;
    scanError.value = '';

    // Remove discovered services
    Object.keys(services.value).forEach(key => {
      if (services.value[key].discovered) {
        delete services.value[key];
      }
    });

    console.log('Stopped mDNS scanning');
  } catch (error: any) {
    console.error('Error stopping mDNS scan:', error);
    scanError.value = `Failed to stop scan: ${error.message || 'Unknown error'}`;
  }
};

const toggleScan = () => {
  if (isScanning.value) {
    stopScan();
  } else {
    startScan();
  }
};

// Cleanup on component unmount
onUnmounted(() => {
  if (isScanning.value) {
    stopScan();
  }
});
</script>

<style scoped>
.controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (min-width: 768px) {
  .controls-grid {
    grid-template-columns: 1fr 100px 150px;
  }
}

.button-group {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

@media (min-width: 768px) {
  .button-group {
    grid-column: 1 / -1;
    flex-direction: row;
  }
}

.warning-text,
.error-text {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9em;
}

.warning-text {
  background-color: var(--ion-color-warning-tint);
  border: 1px solid var(--ion-color-warning);
}

.error-text {
  background-color: var(--ion-color-danger-tint);
  border: 1px solid var(--ion-color-danger);
}

.services-container {
  margin-top: 16px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  text-align: center;
}

.empty-content {
  max-width: 400px;
  padding: 20px;
}

.empty-content p {
  margin: 16px 0;
  line-height: 1.5;
}

.hint {
  font-size: 0.8em;
  opacity: 0.8;
  font-style: italic;
}

.txt-record {
  color: var(--ion-color-medium) !important;
  font-size: 0.75em;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  word-break: break-all;
  margin-top: 8px !important;
}

.tap-hint {
  color: var(--ion-color-success) !important;
  font-weight: 500;
  font-size: 0.85em;
  margin-top: 12px !important;
}

/* Custom styling for discovered services */
ion-item.discovered {
  border-left: 4px solid var(--ion-color-primary);
}

ion-item.discovered:not(.resolved) {
  opacity: 0.7;
}

ion-item.discovered.resolved {
  opacity: 1;
}

/* Spinner styling for scanning state */
ion-spinner {
  margin-right: 8px;
  width: 16px;
  height: 16px;
}
</style>

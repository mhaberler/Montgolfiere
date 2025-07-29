import { usePersistedRef } from '@/composables/usePersistedRef';
import { computed, ref } from 'vue';

import mqtt from 'mqtt';

export const mqttBrokerUrl = usePersistedRef('mqtt_broker_url', import.meta.env.VITE_MQTT_BROKER_URL || '');
export const mqttUser = usePersistedRef('mqtt_user', import.meta.env.VITE_MQTT_BROKER_USER || '');
export const mqttPassword = usePersistedRef('mqtt_password', import.meta.env.VITE_MQTT_BROKER_PASSWORD || '');


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
        if (!mqttBrokerUrl.value || mqttBrokerUrl.value.length === 0) {
            mqttState.value = 'error';
            mqttStatusMsg.value = 'Broker URL is required';
            return;
        }

        const options: any = {
            clean: true,
            clientId: 'mg_' + Math.random().toString(16).substring(2, 10),
            rejectUnauthorized: false, // ONLY for debugging, not production!
            reconnectPeriod: 5000,
            connectTimeout: 30 * 1000,
            keepalive: 60,
            log: console.log.bind(console),

        };

        // Only add username/password if they have values
        if (mqttUser.value && mqttUser.value.length > 0) {
            options.username = mqttUser.value;
        }
        if (mqttPassword.value && mqttPassword.value.length > 0) {
            options.password = mqttPassword.value;
        }

        const client = mqtt.connect(mqttBrokerUrl.value, options);
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
            }, 10000);
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

export {
    mqttStatusColor,
    checkMqttConnection,
    mqttStatusMsg,
    mqttState,
    
};
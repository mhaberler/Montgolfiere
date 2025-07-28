import { usePersistedRef } from '@/composables/usePersistedRef';

export const mqttBrokerUrl = usePersistedRef('mqtt_broker_url', import.meta.env.VITE_MQTT_BROKER_URL || '');
export const mqttUser = usePersistedRef('mqtt_user', import.meta.env.VITE_MQTT_BROKER_USER || '');
export const mqttPassword = usePersistedRef('mqtt_password', import.meta.env.VITE_MQTT_BROKER_PASSWORD || '');


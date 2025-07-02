import { usePersistedRef } from '@/composables/usePersistedRef';

export const mqttBrokerUrl = usePersistedRef('mqtt_broker_url', 'wss://test.mosquitto.org:8081');
export const mqttUser = usePersistedRef('mqtt_user', '');
export const mqttPassword = usePersistedRef('mqtt_password', '');

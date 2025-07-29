import mqtt, { MqttClient } from 'mqtt';

/**
 * Possible MQTT connection statuses.
 */
type MqttStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'offline' | 'error' | 'ended';

/**
 * Options for initializing the MQTT client.
 */
interface MqttInitOptions {
    /**
     * The URL of the MQTT broker (e.g., 'ws://broker.example.com/mqtt' for WebSocket in a browser/Capacitor context).
     */
    brokerUrl: string;

    /**
     * Optional client connection options.
     */
    connectOptions?: mqtt.IClientOptions;

    /**
     * Array of topics to subscribe to upon connection.
     */
    topics: string[];

    /**
     * Callback function to handle incoming messages.
     * This can be used to process location, barometer, or BLE advertisement data received via MQTT.
     */
    onMessageCallback: (topic: string, message: Buffer) => void;

    /**
     * Optional callback for connection errors.
     */
    onErrorCallback?: (error: Error) => void;

    /**
     * Optional callback for reconnection events.
     */
    onReconnectCallback?: () => void;

    /**
     * Optional callback for status changes.
     */
    onStatusChange?: (status: MqttStatus) => void;
}

// Singleton instance promise to avoid re-instantiation
let mqttInstance: Promise<{ client: MqttClient; getStatus: () => MqttStatus }> | null = null;

/**
 * Initializes an MQTT client using connectAsync, subscribes to specified topics upon connection,
 * and sets up event handlers including status inspection. This function ensures a singleton pattern
 * to avoid multiple instantiations in a Capacitor/Ionic app handling location, barometer, and BLE data.
 * Subsequent calls will return the existing instance.
 * 
 * @param options - Configuration options for the MQTT client.
 * @returns A promise that resolves to an object containing the MQTT client and a status getter function.
 */
export async function initializeMqtt(
    options: MqttInitOptions
): Promise<{ client: MqttClient; getStatus: () => MqttStatus }> {
    if (mqttInstance) {
        console.log('Returning existing MQTT instance');
        return await mqttInstance;
    }

    mqttInstance = (async () => {
        // Ensure resubscribe is enabled for handling reconnects (default is true)
        const connectOptions: mqtt.IClientOptions = {
            ...options.connectOptions,
            resubscribe: true, // Automatically resubscribe on reconnect
        };

        let currentStatus: MqttStatus = 'connecting';

        const setStatus = (newStatus: MqttStatus) => {
            if (newStatus !== currentStatus) {
                currentStatus = newStatus;
                console.log(`MQTT status changed to: ${newStatus}`);
                if (options.onStatusChange) {
                    options.onStatusChange(newStatus);
                }
            }
        };

        setStatus('connecting');

        // Connect to the broker using connectAsync
        const client: MqttClient = await mqtt.connectAsync(options.brokerUrl, connectOptions);

        setStatus('connected');

        // Subscribe to topics after successful connection
        for (const topic of options.topics) {
            try {
                await client.subscribeAsync(topic);
                console.log(`Subscribed to topic: ${topic}`);
            } catch (err) {
                console.error(`Failed to subscribe to ${topic}:`, err);
            }
        }

        // Set up message handler
        client.on('message', (topic: string, message: Buffer) => {
            console.log(`Message received on ${topic}`);
            options.onMessageCallback(topic, message);
        });

        // Set up error handler
        client.on('error', (error: Error) => {
            console.error('MQTT connection error:', error);
            setStatus('error');
            if (options.onErrorCallback) {
                options.onErrorCallback(error);
            }
        });

        // Set up reconnect handler
        client.on('reconnect', () => {
            console.log('Reconnecting to MQTT broker...');
            setStatus('reconnecting');
            if (options.onReconnectCallback) {
                options.onReconnectCallback();
            }
        });

        // Additional status event handlers
        client.on('connect', () => setStatus('connected'));
        client.on('close', () => setStatus('disconnected'));
        client.on('disconnect', () => setStatus('disconnected'));
        client.on('offline', () => setStatus('offline'));
        client.on('end', () => setStatus('ended'));

        const getStatus = (): MqttStatus => currentStatus;

        return { client, getStatus };
    })();

    return await mqttInstance;
}

// Example usage in a Capacitor/Ionic app service (e.g., mqtt.service.ts):
// 
// import { initializeMqtt } from './mqttService';
//
// // In your app's initialization or a singleton service method:
// const mqttSetup = await initializeMqtt({
//   brokerUrl: 'ws://your-broker-url:9001/mqtt',
//   topics: ['location/updates', 'barometer/readings', 'ble/advertisements'],
//   onMessageCallback: (topic, message) => {
//     const data = JSON.parse(message.toString());
//     // Process location, barometer, or BLE data here
//     console.log(`Processed data from ${topic}:`, data);
//   },
//   onStatusChange: (status) => {
//     console.log(`MQTT status updated: ${status}`);
//     // Update UI or app state based on status, e.g., show connection indicator
//   },
// });
//
// // Later calls in the app will reuse the same instance:
// const sameMqttSetup = await initializeMqtt({ /* options ignored or must match */ });
// console.log(`Current MQTT status: ${sameMqttSetup.getStatus()}`);
// 
// // To clean up (e.g., on app shutdown or when no longer needed):
// await mqttSetup.client.endAsync();
// mqttInstance = null; // Reset for potential reinitialization if needed
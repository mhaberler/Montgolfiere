import { ref, watch, type Ref } from 'vue';
import { Preferences } from '@capacitor/preferences';

/**
 * A composable that provides a reactive ref whose value is persisted
 * to Capacitor Preferences. Values are restored immediately when the composable
 * is called (at startup for app-level usage, or when component setup runs).
 *
 * @param key The key to use for storing the value in Preferences.
 * @param defaultValue The default value if no value is found in Preferences.
 * @returns A reactive Ref object whose value is persisted.
 */
// export function usePersistedRef<T>(key: string, defaultValue: T): Ref<T> {
//     // ...existing code...
// }

// Option 1: Store value and timestamp together
export function usePersistedRefWithTimestamp<T>(
    key: string,
    defaultValue: T
): { value: Ref<T>, timestamp: Ref<number> } {
    const value = ref(defaultValue) as Ref<T>;
    const timestamp = ref(0);

    const loadData = async () => {
        try {
            const { value: stored } = await Preferences.get({ key });
            if (stored !== null) {
                try {
                    const payload = JSON.parse(stored);
                    value.value = payload.value as T;
                    timestamp.value = payload.timestamp ?? 0;
                } catch (e) {
                    console.warn(`Could not parse stored value for key "${key}". Using default.`, e);
                    value.value = defaultValue;
                    timestamp.value = 0;
                }
            }
        } catch (error) {
            console.error(`Error loading preference for "${key}":`, error);
            value.value = defaultValue;
            timestamp.value = 0;
        }
    };

    loadData();

    const saveData = async () => {
        try {
            const payload = {
                value: value.value,
                timestamp: Date.now(),
            };
            await Preferences.set({ key, value: JSON.stringify(payload) });
            timestamp.value = payload.timestamp;
        } catch (error) {
            console.error(`Error saving preference for "${key}":`, error);
        }
    };

    // Watch with deep enabled to catch nested object changes
    watch(value, saveData, {
        deep: true,
    });

    return { value, timestamp };
}
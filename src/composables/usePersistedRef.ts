// src/composables/usePersistedRef.ts
import { ref, watch, type Ref } from 'vue'; // Remove onMounted
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
export function usePersistedRef<T>(key: string, defaultValue: T): Ref<T> {
  const data: Ref<T> = ref(defaultValue) as Ref<T>;

  const loadData = async () => {
    try {
      const { value: storedValue } = await Preferences.get({ key });

      if (storedValue !== null) {
        try {
          // Try JSON parsing first (handles objects, arrays, and nullable object refs)
          data.value = JSON.parse(storedValue) as T;
        } catch (e) {
          // If JSON parse fails, apply type-specific coercion based on defaultValue
          if (typeof defaultValue === 'number') {
            data.value = Number(storedValue) as T;
          } else if (typeof defaultValue === 'boolean') {
            data.value = (storedValue === 'true') as T;
          } else {
            // Plain string
            data.value = storedValue as T;
          }
        }
      }
    } catch (error) {
      console.error(`Error loading preference for "${key}":`, error);
      data.value = defaultValue;
    }
  };

  // onMounted(loadData); // Load when component mounts - for per component usage

  // !!! KEY CHANGE: Call loadData immediately, not inside onMounted !!!
  // This makes the loading process asynchronous and non-blocking,
  // but it starts as soon as this composable is invoked.
  loadData();

  const saveData = async () => {
    try {
      let valueToStore: string;
      if (typeof data.value === 'object' && data.value !== null) {
        valueToStore = JSON.stringify(data.value);
      } else {
        valueToStore = String(data.value);
      }
      await Preferences.set({ key, value: valueToStore });
    } catch (error) {
      console.error(`Error saving preference for "${key}":`, error);
    }
  };

  // Watch with deep enabled if the current value is an object (not based on defaultValue)
  watch(data, saveData, {
    deep: true,
  });

  return data;
}
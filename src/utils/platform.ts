import { Capacitor } from "@capacitor/core";
import { computed } from 'vue'

export const isNativePlatform = computed(() => {
    return Capacitor.isNativePlatform();
});

export const isIOSPlatform = computed(() => {
    return Capacitor.getPlatform() === 'ios';
});

export const isAndroidPlatform = computed(() => {
    return Capacitor.getPlatform() === "android";
});

export const isWebPlatform = computed(() => {
    return Capacitor.getPlatform() === "web";
});

// Update pressure.ts to import from platform.ts instead of state.ts
//import { isNativePlatform, isIOSPlatform , isAndroidPlatform, isWebPlatform} from '@/utils/platform';
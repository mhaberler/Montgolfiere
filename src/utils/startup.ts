

import { App } from '@capacitor/app';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { ref } from 'vue';
import { startBarometer } from '../sensors/pressure';
import { startLocation } from '../sensors/location';
// import { initializeBLE } from '../sensors/ble';

const wakeLockAvailable = ref(false);

const isSupported = async () => {
    const result = await KeepAwake.isSupported();
    return result.isSupported;
};

const isKeptAwake = async () => {
    const result = await KeepAwake.isKeptAwake();
    return result.isKeptAwake;
};

const cameToForeground = async () => {
    console.log('App is in the foreground');
    if (wakeLockAvailable.value) {
        if (!await isKeptAwake()) {
            console.log('Keeping the app awake');
            await KeepAwake.keepAwake();
        }
    }
}

const wentToBackground = async () => {
    console.log('App is in the background');
    if (wakeLockAvailable.value) {
        if (await isKeptAwake()) {
            console.log('letting the app sleep');
            await KeepAwake.allowSleep();
        }
    }
}

// initializeLocation();
// initializeBLE();

const initializeApp = async () => {

    console.log('Initializing app...');
    wakeLockAvailable.value = await isSupported();
    console.log(`Wake lock supported: ${wakeLockAvailable.value}`);

    // Handle app state changes
    App.addListener('appStateChange', (state) => {
        if (state.isActive) {
            console.log('App is in the foreground');
            cameToForeground();
        } else {
            console.log('App is in the background');
            wentToBackground();
        }
    });
    startBarometer();
    startLocation();
    // initializeLocation();
    // initializeBLE();
    console.log('App initialized and ready to use.');
}

export {
    initializeApp,
    // cameToForeground,
    // wentToBackground,
    // isSupported,
    // isKeptAwake,

    // barometerAvailable,
    // locationAvailable,
    // bleAvailable,
    wakeLockAvailable,
};

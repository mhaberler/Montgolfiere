import { createApp } from 'vue'
import App from './App.vue'

import router from './router';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

/* Tailwind import */
// import "./assets/main.css";

import { SafeArea } from '@capacitor-community/safe-area';

import { initializeApp } from './utils/startup';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { vOnLongPress } from '@vueuse/components';


SafeArea.enable({
    config: {
        // customColorsForSystemBars: true,
        // statusBarColor: '#00000000', // transparent
        // statusBarContent: 'light',
        // navigationBarColor: '#00000000', // transparent
        // navigationBarContent: 'light',
    },
});
// Add global error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't prevent the error from being logged, but don't crash the app
    if (event.reason && event.reason instanceof Error && 
        event.reason.message && event.reason.message.includes('vnode')) {
        console.warn('Caught vnode error during app reload - this is expected');
        event.preventDefault(); // Prevent the error from crashing the app
    }
});

// // Add global error handler for Vue errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (event.error && event.error instanceof Error && 
        event.error.message && event.error.message.includes('vnode')) {
        console.warn('Caught vnode error - this is expected during app reload');
        event.preventDefault(); // Prevent the error from crashing the app
    }
});

CapacitorUpdater.notifyAppReady();


initializeApp();

const app = createApp(App)
  .use(IonicVue)
  .use(router);

// Register the directive globally
app.directive('on-long-press', vOnLongPress);


// Add Vue error handler
app.config.errorHandler = (err, instance, info) => {
    console.error('Vue error:', err);
    console.error('Component instance:', instance);
    console.error('Error info:', info);
    
    // Don't crash the app for vnode errors during reload
    if (err && err instanceof Error && err.message && err.message.includes('vnode')) {
        console.warn('Caught Vue vnode error - this is expected during app reload');
        return;
    }
    
    // Re-throw other errors
    throw err;
};



router.isReady().then(() => {
  app.mount('#app');
});




<template>
    <div>
        <ion-card class="debug-panel">
            <ion-card-header>
                <ion-card-subtitle>CapGo</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
                <p>Bundle version: {{ currentBundle?.bundle?.version }}</p>
                <p>status: {{ currentBundle?.bundle?.status }}</p>
                <p>downloaded: {{ currentBundle?.bundle?.downloaded }}</p>
                <p>id: {{ currentBundle?.bundle?.id }}</p>
                <p>native: {{ currentBundle?.native }}</p>
                
                <IonButton 
                    fill="outline" 
                    size="default" 
                    @click="checkForUpdate"
                    :disabled="isChecking"
                >
                    {{ isChecking ? 'Checking...' : 'Check for Update' }}
                </IonButton>
                
                <IonButton 
                    fill="solid" 
                    size="default" 
                    @click="tryUpdate"
                    :disabled="isUpdating"
                    color="primary"
                >
                    {{ isUpdating ? 'Updating...' : 'Try Update' }}
                </IonButton>
            </ion-card-content>
        </ion-card>
    </div>
</template>


<script setup lang="ts">
import { IonCard, IonCardHeader, IonCardSubtitle, IonCardContent, IonButton } from '@ionic/vue';
import { ref } from "vue";
import {
    CapacitorUpdater,
    CurrentBundleResult,
} from "@capgo/capacitor-updater";
import { Toast } from '@capacitor/toast';

const showToast = async (message: string) => {
    await Toast.show({
        text: message,
        position: 'top',
        duration: 'long'
    });
};

const currentBundle = ref<CurrentBundleResult>();
const isChecking = ref(false);
const isUpdating = ref(false);

const checkForUpdate = async () => {
    if (isChecking.value) return;
    
    isChecking.value = true;
    try {
        showToast('Checking for updates...');
        const latest = await CapacitorUpdater.getLatest();
        
        if (latest.version && latest.version !== currentBundle.value?.bundle?.version) {
            showToast(`New version available: ${latest.version}`);
        } else {
            showToast('App is up to date!');
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
        showToast('Failed to check for updates');
    } finally {
        isChecking.value = false;
    }
};

const tryUpdate = async () => {
    if (isUpdating.value) return;
    
    isUpdating.value = true;
    try {
        showToast('Looking for updates...');
        const latest = await CapacitorUpdater.getLatest();
        
        if (latest.version && latest.version !== currentBundle.value?.bundle?.version) {
            showToast(`Downloading update: ${latest.version}`);
            
            // Download the update
            const bundleInfo = await CapacitorUpdater.download({
                url: latest.url || '',
                version: latest.version,
                sessionKey: latest.sessionKey,
                checksum: latest.checksum
            });
            
            showToast(`Update downloaded! Setting as next version...`);
            
            // Set as next bundle (will be applied on next app restart)
            await CapacitorUpdater.next({ id: bundleInfo.id });
            
            showToast('Update ready! Restart app to apply.');
        } else {
            showToast('No updates available');
        }
    } catch (error) {
        console.error('Error during update:', error);
        showToast('Update failed. Check console for details.');
    } finally {
        isUpdating.value = false;
    }
};

const initializeCapGo = async () => {
    currentBundle.value = await CapacitorUpdater.current(); 

    // Add CapGo event listeners with toast notifications
    CapacitorUpdater.addListener('noNeedUpdate', (event) => {
        console.log('No update needed:', event);
        showToast(`App is up to date (${event.bundle.version})`);
    });

    CapacitorUpdater.addListener('updateAvailable', (event) => {
        console.log('Update available:', event);
        showToast(`Update available: ${event.bundle.version}`);
    });

    CapacitorUpdater.addListener('downloadComplete', (event) => {
        console.log('Download complete:', event);
        showToast(`Update downloaded: ${event.bundle.version}`);
    });

    CapacitorUpdater.addListener('majorAvailable', (event) => {
        console.log('Major update available:', event);
        showToast(`Major update available: ${event.version}`);
    });

    CapacitorUpdater.addListener('updateFailed', (event) => {
        console.log('Update failed:', event);
        showToast(`Update failed: ${event.bundle.version}`);
    });

    CapacitorUpdater.addListener('downloadFailed', (event) => {
        console.log('Download failed:', event);
        showToast(`Download failed: ${event.version}`);
    });

    CapacitorUpdater.addListener('appReloaded', () => {
        console.log('App reloaded');
        showToast('App has been reloaded');
    });

    CapacitorUpdater.addListener('appReady', (event) => {
        console.log('App ready:', event);
        showToast(`App ready with ${event.bundle.version}`);
    });

    CapacitorUpdater.addListener('download', (event) => {
        console.log('Download progress:', event);
        if (event.percent === 100) {
            showToast(`Download complete: ${event.bundle.version}`);
        } else if (event.percent % 25 === 0) { // Show progress at 25%, 50%, 75%
            showToast(`Downloading ${event.bundle.version}: ${event.percent}%`);
        }
    });
}

initializeCapGo();

</script>

<style scoped>

.debug-panel {
    margin: 1rem;
    padding: 1rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.debug-panel ion-card-header {
    background-color: #e9ecef;
    border-bottom: 1px solid #dee2e6;
}
.debug-panel ion-card-content {
    font-size: 0.9rem;
    color: #495057;
}
.debug-panel p {
    margin: 0.5rem 0;
    line-height: 1.5;
}
.debug-panel ion-card-subtitle {
    font-weight: 600;
    color: #343a40;
}
.debug-panel ion-card {
    --background: var(--ion-color-light);
    --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    --border-radius: 0.5rem;
    --padding: 1rem;
    --margin: 1rem;
}
.debug-panel ion-card-header {
    --background: var(--ion-color-light-shade);
    --border-bottom: 1px solid var(--ion-color-light-tint);
}
.debug-panel ion-card-content {
    --color: var(--ion-color-dark);
    --font-size: 0.9rem;
    --line-height: 1.5;
}
.debug-panel ion-card-subtitle {
    --font-weight: 600;
    --color: var(--ion-color-dark-shade);
}
.debug-panel ion-card-title {
    --font-size: 1.2rem;
    --font-weight: 700;
    --color: var(--ion-color-dark);   
}
.debug-panel ion-card p {
    margin: 0.5rem 0;
    line-height: 1.5;
}   
</style>

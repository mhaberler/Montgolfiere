<template>
    <div>
        <ion-card class="debug-panel">
            <ion-card-header>
                <ion-card-subtitle>CapGo</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
                <p>Bundle version: {{ formatCurrentBundleVersion() }}</p>
                <p>Bundle ID: {{ currentBundle?.bundle?.id }}</p>
                <p>Channel: Development</p>
                <p>Status: {{ currentBundle?.bundle?.status }}</p>
                <p>Downloaded: {{ currentBundle?.bundle?.downloaded ? 'Yes' : 'No' }}</p>
                <p>Git SHA: {{ gitSha }}</p>
                <p>Git branch: {{ gitBranch }}</p>
                <p>Build date: {{ buildDate }}</p>
                <p>App version: {{ appVersion }}</p>

                <IonButton fill="outline" size="default" @click="checkForUpdate"
                    :disabled="isChecking || isDeletingBundle">
                    {{ isChecking ? 'Checking...' : 'Check for Update' }}
                </IonButton>

                <IonButton fill="solid" size="default" @click="tryUpdate" :disabled="isUpdating || isDeletingBundle"
                    color="primary">
                    {{ isUpdating ? 'Updating...' : 'download new' }}
                </IonButton>

                <IonButton fill="outline" size="default" @click="revertToNative"
                    :disabled="isReverting || isDeletingBundle" color="warning">
                    {{ isReverting ? 'Reverting...' : 'Revert to Native' }}
                </IonButton>

                <IonButton fill="clear" size="small" @click="refreshBundleInfo"
                    :disabled="isChecking || isUpdating || isReverting || isDeletingBundle" color="medium">
                    {{ isDeletingBundle ? '🗑️ Deleting...' : '🔄 Refresh' }}
                </IonButton>

                <div v-if="availableBundles.length > 0" class="bundles-section">
                    <h4>Available Bundles</h4>
                    <div v-for="bundle in availableBundles" :key="bundle.id" class="bundle-item">
                        <div class="bundle-info">
                            <span class="bundle-version">{{ formatBundleVersion(bundle) }}</span>
                            <span class="bundle-id">ID: {{ bundle.id }}</span>
                            <span class="bundle-status">{{ bundle.status }}</span>
                            <span class="bundle-downloaded">{{ bundle.downloaded ? 'Downloaded' : 'Not Downloaded'
                                }}</span>
                        </div>
                        <div class="bundle-actions">
                            <IonButton size="small" fill="outline" @click="revertToBundle(bundle.id)"
                                :disabled="isReverting || isDeletingBundle || bundle.id === currentBundle?.bundle?.id"
                                color="secondary">
                                {{ bundle.id === currentBundle?.bundle?.id ? 'Current' : 'Use This' }}
                            </IonButton>

                            <IonButton
                                v-if="bundle.downloaded && bundle.id !== currentBundle?.bundle?.id && bundle.id !== 'builtin'"
                                size="small" fill="clear" @click="deleteBundle(bundle.id)"
                                :disabled="isReverting || isDeletingBundle" color="danger" title="Delete this bundle">
                                🗑️
                            </IonButton>
                        </div>
                    </div>
                </div>
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
    BundleInfo,
} from "@capgo/capacitor-updater";
import { Toast } from '@capacitor/toast';

const showToast = async (message: string) => {
    await Toast.show({
        text: message,
        position: 'top',
        duration: 'long'
    });
};
const gitSha = __GIT_COMMIT_HASH__ || 'N/A';
const gitBranch = __GIT_BRANCH_NAME__ || 'N/A';
const buildDate = __VITE_BUILD_DATE__ || 'N/A';
const appVersion = __APP_VERSION__ || 'N/A';

const currentBundle = ref<CurrentBundleResult>();
const availableBundles = ref<BundleInfo[]>([]);
const isChecking = ref(false);
const isUpdating = ref(false);
const isReverting = ref(false);
const isDeletingBundle = ref(false);

const formatBundleVersion = (bundle: BundleInfo) => {
    // If bundle has version, show it; otherwise show a truncated ID for differentiation
    if (bundle.version && bundle.version !== 'builtin') {
        return bundle.version;
    }
    
    // For bundles without version or builtin, show first 8 chars of ID
    if (bundle.id === 'builtin') {
        return 'Native App';
    }
    
    return bundle.id.substring(0, 8) + '...';
};

const formatCurrentBundleVersion = () => {
    if (!currentBundle.value?.bundle) return 'N/A';
    
    const bundle = currentBundle.value.bundle;
    if (bundle.version && bundle.version !== 'builtin') {
        return bundle.version;
    }
    
    if (bundle.id === 'builtin' || currentBundle.value.native) {
        return 'Native App';
    }
    
    return bundle.id?.substring(0, 8) + '...' || 'Unknown';
};

const checkForUpdate = async () => {
    if (isChecking.value) return;
    
    isChecking.value = true;
    try {
        showToast('Checking for updates in development channel...');
        const latest = await CapacitorUpdater.getLatest();
        
        if (latest.version && latest.version !== currentBundle.value?.bundle?.version) {
            showToast(`New version available: ${latest.version}`);
        } else {
            showToast('App is up to date in development channel!');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(errorMessage);
        showToast(errorMessage);
    } finally {
        isChecking.value = false;
    }
};

const tryUpdate = async () => {
    if (isUpdating.value) return;
    
    isUpdating.value = true;
    try {
        showToast('Looking for updates in development channel...');
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
            
            // Refresh bundle info to show the new bundle in the list
            await refreshBundleInfo();
            
            showToast('Update ready! Restart app to apply.');
        } else {
            showToast('No updates available in development channel');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(errorMessage);
        showToast(errorMessage);
    } finally {
        isUpdating.value = false;
    }
};

const revertToNative = async () => {
    if (isReverting.value) return;
    
    isReverting.value = true;
    try {
        showToast('Reverting to native bundle...');
        
        // Reset to the builtin bundle (the one from app store)
        await CapacitorUpdater.reset({ toLastSuccessful: false });
        
        showToast('Reverted to native bundle! Reloading app...');
        
        // Use setTimeout to ensure the toast is shown before reload
        setTimeout(async () => {
            try {
                await CapacitorUpdater.reload();
            } catch (reloadError) {
                console.error('Reload error (this is expected during app restart):', reloadError);
                // Fallback: Try to reload the browser
                if (typeof window !== 'undefined') {
                    window.location.reload();
                }
            }
        }, 1000);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error during revert:', errorMessage);
        showToast('Revert failed. Check console for details.');
        isReverting.value = false;
    }
};

const revertToBundle = async (bundleId: string) => {
    if (isReverting.value) return;
    
    isReverting.value = true;
    try {
        const bundle = availableBundles.value.find(b => b.id === bundleId);
        const version = bundle?.version || bundleId;
        
        showToast(`Switching to version ${version}...`);
        
        // Set the selected bundle as next
        await CapacitorUpdater.next({ id: bundleId });
        
        showToast(`Version ${version} set! Reloading app...`);
        
        // Use setTimeout to ensure the toast is shown before reload
        setTimeout(async () => {
            try {
                await CapacitorUpdater.reload();
            } catch (reloadError) {
                console.error('Reload error (this is expected during app restart):', reloadError);
                // Fallback: Try to reload the browser
                if (typeof window !== 'undefined') {
                    window.location.reload();
                }
            }
        }, 1000);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error during bundle switch:', errorMessage);
        showToast('Switch failed. Check console for details.');
        isReverting.value = false;
    }
};

const loadAvailableBundles = async () => {
    try {
        const result = await CapacitorUpdater.list();
        availableBundles.value = result.bundles || [];
        
        // Debug: Log bundle information to see what we're working with
        console.log('Available bundles:', result.bundles);
        result.bundles?.forEach((bundle, index) => {
            console.log(`Bundle ${index}:`, {
                id: bundle.id,
                version: bundle.version,
                status: bundle.status,
                downloaded: bundle.downloaded
            });
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error loading bundles:', errorMessage);
        availableBundles.value = [];
    }
};

const refreshBundleInfo = async () => {
    try {
        currentBundle.value = await CapacitorUpdater.current(); 
        await loadAvailableBundles();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error refreshing bundle info:', errorMessage);
    }
};

const initializeCapGo = async () => {
    currentBundle.value = await CapacitorUpdater.current(); 
    await loadAvailableBundles();

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

const deleteBundle = async (bundleId: string) => {
    if (isDeletingBundle.value) return;
    
    // Don't allow deleting the current bundle or native bundle
    if (bundleId === currentBundle.value?.bundle?.id || bundleId === 'builtin') {
        showToast('Cannot delete current or native bundle');
        return;
    }
    
    isDeletingBundle.value = true;
    try {
        const bundle = availableBundles.value.find(b => b.id === bundleId);
        const version = bundle?.version || bundleId.substring(0, 8) + '...';
        
        showToast(`Deleting bundle ${version}...`);
        
        // Delete the bundle
        await CapacitorUpdater.delete({ id: bundleId });
        
        showToast(`Bundle ${version} deleted successfully`);
        
        // Refresh bundle list to remove the deleted bundle
        await refreshBundleInfo();
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error deleting bundle:', errorMessage);
        showToast('Failed to delete bundle. Check console for details.');
    } finally {
        isDeletingBundle.value = false;
    }
};

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

.debug-panel ion-item {
    --padding-start: 0;
    --padding-end: 0;
    --inner-padding-end: 0;
    --min-height: 40px;
    margin: 0.5rem 0;
}

.debug-panel ion-select {
    --padding-start: 8px;
    --padding-end: 8px;
}   

.bundles-section {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #dee2e6;
}

.bundles-section h4 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #343a40;
}

.bundle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 0.375rem;
    border: 1px solid #e9ecef;
}

.bundle-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
}

.bundle-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.bundle-actions ion-button {
    --padding-start: 0.5rem;
    --padding-end: 0.5rem;
    min-width: auto;
}

.bundle-version {
    font-weight: 600;
    color: #495057;
    font-size: 0.9rem;
}

.bundle-id {
    font-size: 0.75rem;
    color: #6c757d;
    font-family: monospace;
}

.bundle-status {
    font-size: 0.75rem;
    color: #6c757d;
    text-transform: capitalize;
}

.bundle-downloaded {
    font-size: 0.75rem;
    color: #6c757d;
}

@media (prefers-color-scheme: dark) {
  .bundles-section {
    border-top-color: rgba(255, 255, 255, 0.2);
  }
  
  .bundles-section h4 {
    color: #ecf0f1;
  }
  
  .bundle-item {
    background: rgba(52, 73, 94, 0.6);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .bundle-version {
    color: #ecf0f1;
  }
  
  .bundle-id,
  .bundle-status,
  .bundle-downloaded {
    color: #bdc3c7;
  }
}
</style>

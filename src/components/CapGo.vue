<template>
    <div>
        <ion-card class="debug-panel">
            <ion-card-header>
                <ion-card-subtitle>CapGo</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
                <p>Bundle version: {{ formatCurrentBundleVersion() }}</p>
                <p>Bundle ID: {{ currentBundle?.bundle?.id }}</p>
                <p>Channel: {{ currentChannel || 'Unknown' }}</p>
                <p>Status: {{ currentBundle?.bundle?.status }}</p>
                <p>Downloaded: {{ currentBundle?.bundle?.downloaded ? 'Yes' : 'No' }}</p>
                <p>Native: {{ currentBundle?.native ? 'Yes' : 'No' }}</p>
                
                <ion-item>
                    <ion-label>Channel:</ion-label>
                    <ion-select 
                        v-model="currentChannel" 
                        @selection-change="onChannelChange"
                        :disabled="isChangingChannel || isChecking || isUpdating || isReverting || isDeletingBundle"
                        placeholder="Select Channel"
                        interface="popover"
                    >
                        <ion-select-option 
                            v-for="channel in availableChannels" 
                            :key="channel" 
                            :value="channel"
                        >
                            {{ channel.charAt(0).toUpperCase() + channel.slice(1) }}
                        </ion-select-option>
                    </ion-select>
                </ion-item>
                
                <IonButton 
                    fill="outline" 
                    size="default" 
                    @click="checkForUpdate"
                    :disabled="isChecking || isChangingChannel || isDeletingBundle"
                >
                    {{ isChecking ? 'Checking...' : 'Check for Update' }}
                </IonButton>
                
                <IonButton 
                    fill="solid" 
                    size="default" 
                    @click="tryUpdate"
                    :disabled="isUpdating || isChangingChannel || isDeletingBundle"
                    color="primary"
                >
                    {{ isUpdating ? 'Updating...' : 'Try Update' }}
                </IonButton>
                
                <IonButton 
                    fill="outline" 
                    size="default" 
                    @click="revertToNative"
                    :disabled="isReverting || isChangingChannel || isDeletingBundle"
                    color="warning"
                >
                    {{ isReverting ? 'Reverting...' : 'Revert to Native' }}
                </IonButton>
                
                <IonButton 
                    fill="clear" 
                    size="small" 
                    @click="refreshBundleInfo"
                    :disabled="isChecking || isUpdating || isReverting || isChangingChannel || isDeletingBundle"
                    color="medium"
                >
                    {{ isChangingChannel ? '⏳ Changing...' : isDeletingBundle ? '🗑️ Deleting...' : '🔄 Refresh' }}
                </IonButton>
                
                <div v-if="availableBundles.length > 0" class="bundles-section">
                    <h4>Available Bundles</h4>
                    <div v-for="bundle in availableBundles" :key="bundle.id" class="bundle-item">
                        <div class="bundle-info">
                            <span class="bundle-version">{{ formatBundleVersion(bundle) }}</span>
                            <span class="bundle-id">ID: {{ bundle.id }}</span>
                            <span class="bundle-status">{{ bundle.status }}</span>
                            <span class="bundle-downloaded">{{ bundle.downloaded ? 'Downloaded' : 'Not Downloaded' }}</span>
                        </div>
                        <div class="bundle-actions">
                            <IonButton 
                                size="small" 
                                fill="outline" 
                                @click="revertToBundle(bundle.id)"
                                :disabled="isReverting || isChangingChannel || isDeletingBundle || bundle.id === currentBundle?.bundle?.id"
                                color="secondary"
                            >
                                {{ bundle.id === currentBundle?.bundle?.id ? 'Current' : 'Use This' }}
                            </IonButton>
                            
                            <IonButton 
                                v-if="bundle.downloaded && bundle.id !== currentBundle?.bundle?.id && bundle.id !== 'builtin'"
                                size="small" 
                                fill="clear" 
                                @click="deleteBundle(bundle.id)"
                                :disabled="isReverting || isChangingChannel || isDeletingBundle"
                                color="danger"
                                title="Delete this bundle"
                            >
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
import { IonCard, IonCardHeader, IonCardSubtitle, IonCardContent, IonButton, IonSelect, IonSelectOption, IonItem, IonLabel } from '@ionic/vue';
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

const currentBundle = ref<CurrentBundleResult>();
const availableBundles = ref<BundleInfo[]>([]);
const isChecking = ref(false);
const isUpdating = ref(false);
const isReverting = ref(false);
const currentChannel = ref<string>('production');
const availableChannels = ref<string[]>(['production', 'staging', 'beta', 'development']);
const isChangingChannel = ref(false);
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
        showToast(`Checking for updates in ${currentChannel.value} channel...`);
        const latest = await CapacitorUpdater.getLatest();
        
        if (latest.version && latest.version !== currentBundle.value?.bundle?.version) {
            showToast(`New version available: ${latest.version}`);
        } else {
            showToast(`App is up to date in ${currentChannel.value} channel!`);
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
        showToast(`Looking for updates in ${currentChannel.value} channel...`);
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
            showToast(`No updates available in ${currentChannel.value} channel`);
        }
    } catch (error) {
        console.error('Error during update:', error);
        showToast('Update failed. Check console for details.');
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
        console.error('Error during revert:', error);
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
        console.error('Error during bundle switch:', error);
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
        console.error('Error loading bundles:', error);
        availableBundles.value = [];
    }
};

const refreshBundleInfo = async () => {
    try {
        currentBundle.value = await CapacitorUpdater.current(); 
        await loadAvailableBundles();
    } catch (error) {
        console.error('Error refreshing bundle info:', error);
    }
};

const initializeCapGo = async () => {
    currentBundle.value = await CapacitorUpdater.current(); 
    await loadAvailableBundles();
    await getCurrentChannel();
    await getAvailableChannels();

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

const getCurrentChannel = async () => {
    try {
        const channel = await CapacitorUpdater.getChannel();
        currentChannel.value = channel.channel || 'production';
        console.log('Current channel:', channel);
    } catch (error) {
        console.error('Error getting current channel:', error);
        currentChannel.value = 'production';
    }
};

const onChannelChange = async (event: any) => {
    if (isChangingChannel.value) return;
    
    const newChannel = event.detail.value;
    if (newChannel === currentChannel.value) return;
    
    isChangingChannel.value = true;
    try {
        showToast(`Switching to ${newChannel} channel...`);
        
        await CapacitorUpdater.setChannel({ channel: newChannel });
        currentChannel.value = newChannel;
        
        showToast(`Channel switched to ${newChannel}`);
        
        // Refresh bundle info after channel change
        await refreshBundleInfo();
        
    } catch (error) {
        console.error('Error changing channel:', error);
        showToast('Failed to change channel. Check console for details.');
        // Revert the selection
        await getCurrentChannel();
    } finally {
        isChangingChannel.value = false;
    }
};

const getAvailableChannels = async () => {
    try {
        // CapGo doesn't have a getChannels method, so we'll use a predefined list
        // These are common channel names used in CapGo configurations
        console.log('Using predefined channel list');
        // Keep the default channels we already have
    } catch (error) {
        console.log('Error getting channels:', error);
        // Keep default channels
    }
};

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
        console.error('Error deleting bundle:', error);
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

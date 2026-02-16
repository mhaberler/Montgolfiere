
import { ref, watch } from 'vue'
import { Network, ConnectionStatus } from '@capacitor/network';
import { boolean } from 'mathjs';

const networkStatus = ref<ConnectionStatus>()
const wifiActive = ref<boolean>(false)

watch(networkStatus,
    async (networkStatus, prevnetworkStatus) => {
        wifiActive.value = ((networkStatus?.connected == true)&& (networkStatus?.connectionType == 'wifi'))
        console.log('WiFi status changed', wifiActive.value);
    },
    { immediate: true },
)

const startNetworkObserver = async () => {
    networkStatus.value = await Network.getStatus();
    try {
        Network.addListener('networkStatusChange', status => {
            // console.log('Network status notification', status);
            if ((status.connected != networkStatus.value?.connected) ||
                (status.connectionType != networkStatus.value?.connectionType)) {
                networkStatus.value = status
                wifiActive.value = (networkStatus.value?.connected && networkStatus.value?.connectionType == 'wifi')
                console.log('Network status changed', status);
            }
        })
    } catch (error) {
        console.error('Network.removeAllListeners fail:', error)
    }
}

const stopNetworkObserver = async () => {
    try {
        Network.removeAllListeners()
    } catch (error) {
        console.error('Network.removeAllListeners fail:', error)
    }
}

const getCurrentNetworkStatus = async () => {
    const status = await Network.getStatus();
    console.log('Network status:', status);
    return status;
};

export {
    networkStatus,
    wifiActive,
    startNetworkObserver,
    stopNetworkObserver,
    getCurrentNetworkStatus
}
<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Playground</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content :fullscreen="true">
            <div class="units-container">
                <div class="units-grid">
                    <ValueCard :value="clicks" :name="vcname" :unit="einheit" :tick="ticker" :batteryStatus="32" />
                    <div>
                        <button @click="incrementValue">Increment</button>
                    </div>
                    <EnvelopeUnit @assign-device="goToDeviceAssignment" />
                    <OATUnit @assign-device="goToDeviceAssignment" />
                    <TankUnit unit-type="Tank1" @assign-device="goToDeviceAssignment" />
                    <TankUnit unit-type="Tank2" @assign-device="goToDeviceAssignment" />
                    <TankUnit unit-type="Tank3" @assign-device="goToDeviceAssignment" />
                    <BoxUnit unit-type="Box" @assign-device="goToDeviceAssignment" /> -->
                </div>
            </div>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent
} from '@ionic/vue';

import { useRouter } from 'vue-router';
import { ticker } from '../utils/state';
import ValueCard from '@/components/ValueCard.vue';

const router = useRouter();

const goToDeviceAssignment = () => {
    router.push('/tabs/tab2');
};


import { ref } from 'vue';
const vcname = ref("Wert");
const einheit = ref("Grad");

const clicks = ref<number>(42);

function incrementValue() {
    console.log("incrementValue")
    clicks.value++;
}

</script>

<style scoped>
.units-container {
    padding: 2px;
}

.units-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2px;
}

@media (max-width: 768px) {
    .units-grid {
        grid-template-columns: 1fr;
    }
}
</style>

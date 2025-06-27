<template>
  <ion-page>
    <!-- <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-content>
      <ion-card>
        <ion-card-header>
          <ion-card-title>Configuration</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item>
              <ion-label>use QNH</ion-label>
              <ion-toggle v-model="useReferencePressure"></ion-toggle>
            </ion-item>
            <ion-item>
              <ion-label>QNH Pressure (hPa)</ion-label>
              <ion-input type="number" min="800" max="1100" step="1" v-model.number="referencePressure"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label>Transition altitude (ft)</ion-label>
              <ion-input type="number" min="0" max="12000" step="1000" v-model.number="transitionAltitude"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label>EKF Variance history (sec)</ion-label>
              <ion-input type="number" min="1" max="360" v-model.number="historySeconds"></ion-input>
            </ion-item>
            <ion-item>
              <ion-label>Show Debug Info</ion-label>
              <ion-button fill="outline" size="small" @click="toggleDebugInfo">
                {{ showDebugInfo ? 'Hide' : 'Show' }}
              </ion-button>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">

import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonToggle, IonInput, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton } from '@ionic/vue';
import { ref } from 'vue';

import {
  referencePressure,
  useReferencePressure,
  transitionAltitude,
  historySeconds,
  currentVariance,
  baroActive,
  baroRate,
  showDebugInfo
} from '@/utils/state';

// Volatile ref for debug info toggle (doesn't persist)
// const showDebugInfo = ref(false);

const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value;
};
</script>

<style scoped>
ion-content {
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

ion-card {
  margin-bottom: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

ion-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

ion-card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
  padding: 16px 20px;
}

ion-card-title {
  font-size: 1.4rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

ion-card-content {
  padding: 0;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

ion-list {
  background: transparent;
  border-radius: 0 0 16px 16px;
}

ion-item {
  --background: rgba(255, 255, 255, 0.95);
  --border-color: rgba(0, 0, 0, 0.1);
  margin-bottom: 0px;
  border-radius: 0;
  transition: all 0.3s ease;
  --min-height: 44px;
  display: flex;
  align-items: center;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

ion-item:last-child {
  border-radius: 0 0 16px 16px;
  margin-bottom: 0;
}

ion-item:hover {
  --background: rgba(255, 255, 255, 1);
  transform: translateX(4px);
}

ion-label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 1rem;
  min-width: 200px;
  flex: 0 0 200px;
  white-space: nowrap;
}

ion-input {
  --background: rgba(255, 255, 255, 0.8);
  --border-radius: 8px;
  --padding-start: 12px;
  --padding-end: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

ion-input:focus-within {
  --background: rgba(255, 255, 255, 1);
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

ion-toggle {
  --background: #e0e0e0;
  --background-checked: #667eea;
  --handle-background: white;
  --handle-background-checked: white;
  --handle-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

ion-toggle:hover {
  transform: scale(1.05);
}

ion-button {
  --background: rgba(102, 126, 234, 0.1);
  --color: #667eea;
  --border-color: #667eea;
  --border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

ion-button:hover {
  --background: #667eea;
  --color: white;
  transform: scale(1.05);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  ion-content {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  }
  
  ion-card {
    background: rgba(52, 73, 94, 0.9);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  ion-item {
    --background: rgba(52, 73, 94, 0.8);
    --color: #ecf0f1;
  }
  
  ion-item:hover {
    --background: rgba(52, 73, 94, 1);
  }
  
  ion-label {
    color: #ecf0f1;
  }
  
  ion-input {
    --background: rgba(44, 62, 80, 0.8);
    --color: #ecf0f1;
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  ion-content {
    padding: 12px;
  }
  
  ion-card {
    margin-bottom: 16px;
    border-radius: 12px;
  }
  
  ion-card-header {
    padding: 16px;
    border-radius: 12px 12px 0 0;
  }
  
  ion-card-title {
    font-size: 1.2rem;
  }
  
  ion-item:hover {
    transform: none;
  }
  
  ion-label {
    min-width: 150px;
    flex: 0 0 150px;
    font-size: 0.9rem;
  }
}
</style>
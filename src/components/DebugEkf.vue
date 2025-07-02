<template>
    <div>
        <ion-card v-if="showDebugInfo" class="debug-panel">
            <!-- <ion-card-header>
                <ion-card-subtitle>EKF & pressure</ion-card-subtitle>
            </ion-card-header> -->
            <ion-card-content>
                <p>raw Altitude ISA: {{ rawAltitudeISA.toFixed(1) }}</p>
                <p>EKF Altitude ISA/QNH (m): {{ ekfAltitudeISA.toFixed(1) }} / {{ ekfAltitudeQNH.toFixed(1) }}</p>
                <p>EKF Velocity (m/s): {{ ekfVelocity.toFixed(2) }}</p>
                <p>EKF Acceleration (mm/s^2): {{ (ekfAcceleration*1000.0).toFixed(1) }}</p>
                <p>Variance: {{ currentVariance.toFixed(6) }}</p>
                <p>Pressure (hPa): {{ pressure.toFixed(1) }}</p>
                <p>Baro rate samples/sec: {{ baroRate.toFixed(1) }}</p>
            </ion-card-content>
        </ion-card>
    </div>
</template>

<script setup lang="ts">
import { IonCard, IonCardHeader, IonCardSubtitle, IonCardContent } from '@ionic/vue';
import {
    ekfAltitudeISA,
    ekfAltitudeQNH,
    ekfVelocity,
    ekfAcceleration,
    showDebugInfo,
    currentVariance,
    baroRate,
    pressure,
    rawAltitudeISA,
} from '@/utils/state';
</script>

<style scoped>
.sensor-display {
    border: 2px solid currentColor;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 245, 245, 0.95));
    backdrop-filter: blur(10px);
    min-width: 8rem;
    max-width: 12rem;
    box-sizing: border-box;
    box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.15),
        0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.sensor-display::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #007bff, rgba(255, 255, 255, 0.3));
    opacity: 0.8;
}

.sensor-display:hover {
    transform: translateY(-2px);
    box-shadow:
        0 8px 20px rgba(0, 0, 0, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.15);
}

.sensor-value {
    font-size: clamp(1.8rem, 4vw, 2rem);
    font-weight: 900;
    color: #007bff;
    margin-bottom: 0.25rem;
    line-height: 1.2;
    text-align: center;
    text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
    animation: pulse 2s ease-in-out infinite alternate;
}

@keyframes pulse {
    from {
        opacity: 0.9;
    }

    to {
        opacity: 1;
    }
}

.sensor-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 0.5rem;
    padding-top: 0.25rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.sensor-unit {
    font-size: clamp(0.75rem, 2vw, 0.875rem);
    font-weight: 600;
    color: #555;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.1rem 0.3rem;
    border-radius: 0.25rem;
}

.sensor-name {
    font-size: clamp(0.625rem, 1.5vw, 0.75rem);
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
    font-weight: 700;
    opacity: 0.8;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    .sensor-display {
        background: linear-gradient(135deg, rgba(40, 40, 40, 0.98), rgba(30, 30, 30, 0.95));
        border-color: rgba(255, 255, 255, 0.2);
    }

    .sensor-unit {
        color: #ccc;
        background: rgba(255, 255, 255, 0.1);
    }

    .sensor-name {
        color: #aaa;
    }
}

@media (max-width: 480px) {
    .sensor-display {
        min-width: 6rem;
        max-width: 10rem;
        padding: 0.5rem 0.75rem;
    }

    .sensor-display:hover {
        transform: none;
        /* Disable hover effects on mobile */
    }
}
</style>
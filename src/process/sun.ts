import { getTimes, GetTimesResult } from 'suncalc';
import { ref, watch } from 'vue';
import {
    location, locationAvailable
} from '../sensors/location';
import {
    elevation, elevationAvailable,
} from '../sensors/location';

const BCMT = ref<string | null>(null);
const ECET = ref<string | null>(null);

// Format times as HH:mm with leading zeros
const formatTime = (date: Date): string => {
    const hours = date.getUTCHours().toString();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Watch for changes in availability status
watch([locationAvailable, elevationAvailable], ([newLocationAvailable, newElevationAvailable], [oldLocationAvailable, oldElevationAvailable]) => {
    // Only trigger if availability status of either sensor changed
    const locationAvailabilityChanged = newLocationAvailable !== oldLocationAvailable;
    const elevationAvailabilityChanged = newElevationAvailable !== oldElevationAvailable;
    
    if (locationAvailabilityChanged || elevationAvailabilityChanged) {
        console.log(`Availability changed - Location: ${newLocationAvailable}, Elevation: ${newElevationAvailable}`);
        
        // If both are now available, calculate sun times
        if (newLocationAvailable && location.value != null && newElevationAvailable && elevation.value != null) {
            const times = getTimes(new Date(), location.value.coords.latitude, location.value.coords.longitude, elevation.value);
            
            BCMT.value = formatTime(times.dawn);
            ECET.value = formatTime(times.dusk);
            
            console.log(`BCMT = ${BCMT.value} ECET = ${ECET.value}`);
        } else {
            // Clear values if either becomes unavailable
            BCMT.value = null;
            ECET.value = null;
            console.log('Sun times cleared - sensors not available');
        }
    }
});

export {
    BCMT,
    ECET
}
import { ref } from "vue";
import {
  Geolocation,
  Position,
} from "@capacitor/geolocation";
import { MockGeolocation } from "../simulated/MockGeolocations";
import { Capacitor } from "@capacitor/core";

const options: PositionOptions = {
  enableHighAccuracy: true, // Use high accuracy mode
  timeout: 10000, 
  maximumAge: 0, // Do not use cached position
};

const isWeb = Capacitor.getPlatform() === "web"; 
// Create the appropriate geolocation instance based on platform
const geolocation = isWeb ? new MockGeolocation() : Geolocation;

const permissionStatus = ref<string | null>(null);
const locationAvailable = ref(false);
const location = ref<Position | null>(null);
const locationError = ref<string | null>(null);

let watchId: string | null = null;

const checkPermissions = async () => {
  try {
    if (!isWeb) {
      await Geolocation.checkPermissions();
    }
    // MockGeolocation doesn't need permissions
  } catch (err: any) {
    console.error(
      "location services disabled: " + err ? err.message : "Unknown error"
    );
  }
};

// Request permissions
const requestPermissions = async () => {
  try {
    if (!isWeb) {
      const permissions = await Geolocation.requestPermissions();
      permissionStatus.value = permissions.location;
    }
    // MockGeolocation doesn't need permissions
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    locationError.value = "Failed to request permissions: " + message;
    console.error(locationError.value);
  }
};

const startLocation = async () => {
  await checkPermissions();
  await requestPermissions();
  try {
    const result = await geolocation.getCurrentPosition(options);
    location.value = result;
    locationAvailable.value = true;
    // console.log('Current position:', location.value);

    if (isWeb) {
      // Use MockGeolocation's watchPosition method
      watchId = (geolocation as MockGeolocation).watchPosition(
        (position: Position) => {
          location.value = position;
          // console.log('Updated position:', location.value);
        },
        (err: GeolocationPositionError) => {
          locationError.value = err.message || "Unknown error";
          locationAvailable.value = false;
          console.error("Error watching position:", locationError.value);
        }
      );
    } else {
      // Use real Geolocation's watchPosition method
      watchId = await Geolocation.watchPosition(
        options,
        (position: any, err: any) => {
          if (err) {
            locationError.value = err.message || "Unknown error";
            locationAvailable.value = false;
            console.error("Error watching position:", locationError.value);
            return;
          }
          if (position) {
            location.value = position;
            // console.log('Updated position:', location.value);
          }
        }
      );
    }
  } catch (error) {
    console.error("Error getting current position:" + error);
    locationAvailable.value = false;
    if (error instanceof Error) {
      locationError.value = error.message;
    } else {
      locationError.value = "Unknown error";
    }
  }
};

const stopLocation = async () => {
  if (watchId) {
    if (isWeb) {
      // Use MockGeolocation's clearWatch method
      (geolocation as MockGeolocation).clearWatch(watchId);
    } else {
      // Use real Geolocation's clearWatch method
      await Geolocation.clearWatch({ id: watchId });
    }
    watchId = null;
    console.log("Stopped watching position");
  }
};

export {
  locationAvailable,
  location,
  locationError,
  startLocation,
  stopLocation,
};

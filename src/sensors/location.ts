import { ref } from "vue";
import {
  Geolocation,
  Position,
} from "@capacitor/geolocation";

const options: PositionOptions = {
  enableHighAccuracy: true, // Use high accuracy mode
  timeout: 10000, 
  maximumAge: 0, // Do not use cached position
};

const permissionStatus = ref<string | null>(null);
const locationAvailable = ref(false);
const location = ref<Position | null>(null);
const locationError = ref<string | null>(null);

let watchId: string | null = null;

const checkPermissions = async () => {
  try {
    const permissions = await Geolocation.checkPermissions();
  } catch (err: any) {
    console.error(
      "location services disabled: " + err ? err.message : "Unknown error"
    );
  }
};

// Request permissions
const requestPermissions = async () => {
  try {
    const permissions = await Geolocation.requestPermissions();
    permissionStatus.value = permissions.location;
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
    const result = await Geolocation.getCurrentPosition(options);
    location.value = result;
    locationAvailable.value = true;
    // console.log('Current position:', location.value);

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
    await Geolocation.clearWatch({ id: watchId });
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

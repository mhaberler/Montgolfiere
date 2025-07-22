import { ref, watch } from "vue";
import {
  Geolocation,
  Position,
} from "@capacitor/geolocation";
import { MockGeolocation } from "../simulated/MockGeolocations";
import { Capacitor } from "@capacitor/core";
import { DEMLookup, DEMInfo } from "../dem/DEMLookup";



const options: PositionOptions = {
  enableHighAccuracy: true, // Use high accuracy mode
  timeout: 20000,
  maximumAge: 0, // Do not use cached position
};

const androidOptions: PositionOptions = {
  enableHighAccuracy: false, // Battery saving mode
  timeout: 20000,
  maximumAge: 0,
};

const isWeb = Capacitor.getPlatform() === "web";
// Create the appropriate geolocation instance based on platform
const geolocation = isWeb ? new MockGeolocation() : Geolocation;

const permissionStatus = ref<string | null>(null);
const locationAvailable = ref(false);
const location = ref<Position | null>(null);
const locationError = ref<string | null>(null);

let watchId: string | null = null;
const demLookup = ref<DEMLookup | null>(null);
const demUrl = ref('https://static.mah.priv.at/cors/DTM_Italy_20m_v2b_by_Sonny.pmtiles');
const demInfo = ref<DEMInfo | null>(null);
const elevation = ref<number | null>(null);


watch(
  demUrl,
  async (newdemUrl, olddemUrl) => {
    // instantiate new DEMlookupp here
    try {
      demLookup.value = new DEMLookup(demUrl.value, {
        maxCacheSize: 100,
        debug: false,
      });
      demInfo.value = await demLookup.value.getDEMInfo();
      console.log(`DEM url is ${newdemUrl}, old = ${olddemUrl}`);
      console.log(`demInfo: ${JSON.stringify(demInfo.value)}`);
      // Handle the result
    } catch (error) {
      console.log(error);
    }
  },
  { immediate: true }
)

// lookup elevation on location change
watch(location, async (newlocation) => {
  // console.log(`location is ${newlocation}`)

  if (newlocation && demLookup.value) {
    try {
      const result = await demLookup.value.getElevation(newlocation.coords.latitude, newlocation.coords.longitude);
      elevation.value = result?.elevation ?? null;
      // console.log(`Elevation: ${elevation.value}m`);
    } catch (error) {
      console.error('Error getting elevation:', error);
      elevation.value = null;
    }
  } else {
    elevation.value = null;
  }
})

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
    // Get initial position
    const result = await geolocation.getCurrentPosition(options);
    location.value = result;
    locationAvailable.value = true;

    if (isWeb) {
      // Web implementation (unchanged)
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
      // Enhanced implementation for native platforms
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

      // For Android, supplement with periodic getCurrentPosition calls
      if (Capacitor.getPlatform() === 'android') {
        startAndroidLocationPolling();
      }
      // startDEMLookup()
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

let androidPollingInterval: ReturnType<typeof setInterval> | null = null;

const startAndroidLocationPolling = () => {
  // Poll every 2 seconds on Android for more frequent updates
  androidPollingInterval = setInterval(async () => {
    try {
      const result = await Geolocation.getCurrentPosition(androidOptions);
      location.value = result;
    } catch (error) {
      console.error("Android polling error:", error);
    }
  }, 2000);
};

const stopLocation = async () => {
  if (watchId) {
    if (isWeb) {
      (geolocation as MockGeolocation).clearWatch(watchId);
    } else {
      await Geolocation.clearWatch({ id: watchId });
    }
    watchId = null;
  }

  // Stop Android polling
  if (androidPollingInterval) {
    clearInterval(androidPollingInterval);
    androidPollingInterval = null;
  }

  console.log("Stopped watching position");
};

export {
  locationAvailable,
  location,
  locationError,
  startLocation,
  stopLocation,
  elevation,
  demLookup, 
  demUrl, 
  demInfo
};

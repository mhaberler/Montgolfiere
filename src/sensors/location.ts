import { ref, watch } from "vue";
import {
  Geolocation,
  Position,
  PositionOptions,
} from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { DEMLookup, DEMInfo } from "@/dem/DEMLookup";
import { MapterhornDEMLookup } from "@/dem/MapterhornDEMLookup";
import { selectedDemUrl } from "@/composables/useDemUrl";

const options: PositionOptions = {
  enableHighAccuracy: true, // Use high accuracy mode
  timeout: 60000,
  maximumAge: 0, // Do not use cached position
  interval: 2000, // Android only: desired watchPosition update cadence
  minimumUpdateInterval: 1000, // Android only: fastest acceptable update cadence
};

const isWeb = Capacitor.getPlatform() === "web";
const geolocation = Geolocation;

const permissionStatus = ref<string | null>(null);
const locationAvailable = ref(false);
const location = ref<Position | null>(null);
const locationError = ref<string | null>(null);

let watchId: string | null = null;
const demLookup = ref<DEMLookup | null>(null);
const demInfo = ref<DEMInfo | null>(null);
const elevation = ref<number | null>(null);
const elevationAvailable = ref(false);

const SPEED_THRESHOLD = 0.5; // m/s — below this, GPS course-over-ground is unreliable
const HEADING_EMA_ALPHA = 0.3;

const filteredHeading = ref<number | null>(null);
let headingVector: { x: number; y: number } | null = null; // unit-vector EMA state

watch(
  selectedDemUrl,
  async (newdemUrl, olddemUrl) => {
    // instantiate new DEMlookupp here
    try {
      const url = selectedDemUrl.value;
      const isMapterhorn = url.includes("download.mapterhorn.com");
      if (isMapterhorn) {
        // Extract base URL (strip /planet.pmtiles if present)
        const baseUrl = url.replace(/\/planet\.pmtiles$/, "");
        demLookup.value = new MapterhornDEMLookup(baseUrl, {
          maxCacheSize: 10,
          debug: false,
        });
      } else {
        demLookup.value = new DEMLookup(url, {
          maxCacheSize: 10,
          debug: false,
        });
      }
      demInfo.value = await demLookup.value.getDEMInfo();
      console.log(`DEM url is ${newdemUrl}, old = ${olddemUrl}`);
      console.log(`demInfo: ${JSON.stringify(demInfo.value)}`);
      // Handle the result
    } catch (error) {
      console.log(error);
    }
  },
  { immediate: true },
);

// lookup elevation on location change
watch(location, async (newlocation) => {
  // console.log(`location is ${JSON.stringify(newlocation)}`);
  if (newlocation && demLookup.value) {
    try {
      const result = await demLookup.value.getElevation(
        newlocation.coords.latitude,
        newlocation.coords.longitude,
      );
      elevation.value = result?.elevation ?? null;
      if (elevation.value != null && !elevationAvailable.value) {
        elevationAvailable.value = true;
        console.log(`Elevation: ${elevation.value}m`);
      }
      //  console.log(`Elevation: ${elevation.value}m`);
    } catch (error) {
      console.error("Error getting elevation:", error);
      elevation.value = null;
      if (elevationAvailable.value) {
        elevationAvailable.value = false;
      }
    }
  } else {
    elevation.value = null;
    elevationAvailable.value = false;
  }
});

// smooth heading with a speed-gated unit-vector EMA to avoid GPS course-over-ground
// noise/jumps at low ground speed
watch(location, (newlocation) => {
  const speed = newlocation?.coords?.speed;
  const heading = newlocation?.coords?.heading;

  if (
    speed == null ||
    isNaN(speed) ||
    speed < SPEED_THRESHOLD ||
    heading == null ||
    isNaN(heading)
  ) {
    filteredHeading.value = null;
    headingVector = null; // reset filter state so it doesn't resume stale on next fix
    return;
  }

  const rad = (heading * Math.PI) / 180;
  const x = Math.cos(rad);
  const y = Math.sin(rad);

  if (headingVector === null) {
    headingVector = { x, y };
  } else {
    headingVector = {
      x: headingVector.x + HEADING_EMA_ALPHA * (x - headingVector.x),
      y: headingVector.y + HEADING_EMA_ALPHA * (y - headingVector.y),
    };
  }

  let deg = (Math.atan2(headingVector.y, headingVector.x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  filteredHeading.value = deg;
});

const checkPermissions = async () => {
  try {
    if (!isWeb) {
      await Geolocation.checkPermissions();
    }
  } catch (err: any) {
    console.error(
      "location services disabled: " + err ? err.message : "Unknown error",
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    locationError.value = "Failed to request permissions: " + message;
    console.error(locationError.value);
  }
};

const startLocation = async () => {
  if (isWeb) {
    console.log("startLocation: noop for web");
    return;
  }

  await checkPermissions();
  await requestPermissions();

  try {
    // Get initial position
    const result = await geolocation.getCurrentPosition(options);
    location.value = result;
    locationAvailable.value = true;

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
      },
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
  if (isWeb) {
    console.log("stopLocation: noop for web");
    return;
  }
  if (watchId) {
    await Geolocation.clearWatch({ id: watchId });
    watchId = null;
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
  elevationAvailable,
  demLookup,
  selectedDemUrl as demUrl,
  demInfo,
  filteredHeading,
};

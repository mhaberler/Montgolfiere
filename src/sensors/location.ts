import { ref, watch } from 'vue'
import { Geolocation, Position } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import { DEMLookup, DEMInfo } from '@/dem/DEMLookup'
import { selectedDemUrl } from '@/composables/useDemUrl'

const options: PositionOptions = {
  enableHighAccuracy: true, // Use high accuracy mode
  timeout: 20000,
  maximumAge: 0, // Do not use cached position
}

const androidOptions: PositionOptions = {
  enableHighAccuracy: false, // Battery saving mode
  timeout: 20000,
  maximumAge: 0,
}

const isWeb = Capacitor.getPlatform() === 'web'
const geolocation = Geolocation

const permissionStatus = ref<string | null>(null)
const locationAvailable = ref(false)
const location = ref<Position | null>(null)
const locationError = ref<string | null>(null)

let watchId: string | null = null
const demLookup = ref<DEMLookup | null>(null)
const demInfo = ref<DEMInfo | null>(null)
const elevation = ref<number | null>(null)
const elevationAvailable = ref(false)

watch(
  selectedDemUrl,
  async (newdemUrl, olddemUrl) => {
    // instantiate new DEMlookupp here
    try {
      demLookup.value = new DEMLookup(selectedDemUrl.value, {
        maxCacheSize: 10,
        debug: false,
      })
      demInfo.value = await demLookup.value.getDEMInfo()
      console.log(`DEM url is ${newdemUrl}, old = ${olddemUrl}`)
      console.log(`demInfo: ${JSON.stringify(demInfo.value)}`)
      // Handle the result
    } catch (error) {
      console.log(error)
    }
  },
  { immediate: true },
)

// lookup elevation on location change
watch(location, async (newlocation) => {
  // console.log(`location is ${JSON.stringify(newlocation)}`);
  if (newlocation && demLookup.value) {
    try {
      const result = await demLookup.value.getElevation(
        newlocation.coords.latitude,
        newlocation.coords.longitude,
      )
      elevation.value = result?.elevation ?? null
      if (elevation.value != null && !elevationAvailable.value) {
        elevationAvailable.value = true
        console.log(`Elevation: ${elevation.value}m`)
      }
      //  console.log(`Elevation: ${elevation.value}m`);
    } catch (error) {
      console.error('Error getting elevation:', error)
      elevation.value = null
      if (elevationAvailable.value) {
        elevationAvailable.value = false
      }
    }
  } else {
    elevation.value = null
    elevationAvailable.value = false
  }
})

const checkPermissions = async () => {
  try {
    if (!isWeb) {
      await Geolocation.checkPermissions()
    }
  } catch (err: any) {
    console.error('location services disabled: ' + err ? err.message : 'Unknown error')
  }
}

// Request permissions
const requestPermissions = async () => {
  try {
    if (!isWeb) {
      const permissions = await Geolocation.requestPermissions()
      permissionStatus.value = permissions.location
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    locationError.value = 'Failed to request permissions: ' + message
    console.error(locationError.value)
  }
}

const startLocation = async () => {
  if (isWeb) {
    console.log('startLocation: noop for web')
    return
  }

  await checkPermissions()
  await requestPermissions()

  try {
    // Get initial position
    const result = await geolocation.getCurrentPosition(options)
    location.value = result
    locationAvailable.value = true

    watchId = await Geolocation.watchPosition(options, (position: any, err: any) => {
      if (err) {
        locationError.value = err.message || 'Unknown error'
        locationAvailable.value = false
        console.error('Error watching position:', locationError.value)
        return
      }
      if (position) {
        location.value = position
        // console.log('Updated position:', location.value);
      }
    })

    // For Android, supplement with periodic getCurrentPosition calls
    if (Capacitor.getPlatform() === 'android') {
      startAndroidLocationPolling()
    }
  } catch (error) {
    console.error('Error getting current position:' + error)
    locationAvailable.value = false
    if (error instanceof Error) {
      locationError.value = error.message
    } else {
      locationError.value = 'Unknown error'
    }
  }
}

let androidPollingInterval: ReturnType<typeof setInterval> | null = null

const startAndroidLocationPolling = () => {
  // Poll every 2 seconds on Android for more frequent updates
  androidPollingInterval = setInterval(async () => {
    try {
      const result = await Geolocation.getCurrentPosition(androidOptions)
      location.value = result
    } catch (error) {
      console.error('Android polling error:', error)
    }
  }, 2000)
}

const stopLocation = async () => {
  if (isWeb) {
    console.log('stopLocation: noop for web')
    return
  }
  if (watchId) {
    await Geolocation.clearWatch({ id: watchId })
    watchId = null
  }
  // Stop Android polling
  if (androidPollingInterval) {
    clearInterval(androidPollingInterval)
    androidPollingInterval = null
  }
  console.log('Stopped watching position')
}

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
}

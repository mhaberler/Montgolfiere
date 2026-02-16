import { locationAvailable, location } from '../sensors/location'
import { Position } from '@capacitor/geolocation'
import { manualQNHvalue, autoQNHflag } from '@/composables/useAppState'

import { Http, HttpResponse } from '@leadscout/http'
import { ref, watch, watchEffect } from 'vue'
import { distance } from '@turf/distance'
import { point } from '@turf/helpers'

const degrees = 2
const numNeighbours = 5

// Persisted QNH settings - imported directly from centralized app state
const currentQNH = ref<number>(0)
const currentQNHsource = ref<string>('man')

// Add ref to store airport QNH data
const airportQnhData = ref<
  Array<{
    icao: string
    site: string
    distance: number
    qnh: number
  }>
>([])

// Define interface for aerodrome data
interface Aerodrome {
  icaoId: string
  iataId: string
  faaId: string
  wmoId: string
  lat: number
  lon: number
  elev: number
  site: string
  state: string
  country: string
  priority: number
  distance?: number // Add distance property for sorting
  metar?: Metar // Add optional METAR data
}

// Define interface for METAR data
interface Metar {
  metar_id: number
  icaoId: string
  receiptTime: string
  obsTime: number
  reportTime: string
  temp: number
  dewp: number
  wdir: string
  wspd: number
  wgst: number | null
  visib: string
  altim: number
  slp: number | null
  qcField: number
  wxString: string | null
  presTend: number | null
  maxT: number | null
  minT: number | null
  maxT24: number | null
  minT24: number | null
  precip: number | null
  pcp3hr: number | null
  pcp6hr: number | null
  pcp24hr: number | null
  snow: number | null
  vertVis: number | null
  metarType: string
  rawOb: string
  mostRecent: number
  lat: number
  lon: number
  elev: number
  prior: number
  name: string
  clouds: Array<{
    cover: string
    base: number | null
  }>
}

// metar example:
// [
//     {
//         "metar_id": 812255250,
//         "icaoId": "LOWG",
//         "receiptTime": "2025-08-08 20:25:10",
//         "obsTime": 1754684400,
//         "reportTime": "2025-08-08 20:20:00",
//         "temp": 22,
//         "dewp": 16,
//         "wdir": "VRB",
//         "wspd": 1,
//         "wgst": null,
//         "visib": "6+",
//         "altim": 1021,
//         "slp": null,
//         "qcField": 18,
//         "wxString": null,
//         "presTend": null,
//         "maxT": null,
//         "minT": null,
//         "maxT24": null,
//         "minT24": null,
//         "precip": null,
//         "pcp3hr": null,
//         "pcp6hr": null,
//         "pcp24hr": null,
//         "snow": null,
//         "vertVis": null,
//         "metarType": "METAR",
//         "rawOb": "LOWG 082020Z AUTO VRB01KT 9999 NCD 22/16 Q1021 NOSIG",
//         "mostRecent": 1,
//         "lat": 46.997,
//         "lon": 15.447,
//         "elev": 337,
//         "prior": 3,
//         "name": "Graz Arpt, ST, AT",
//         "clouds": [
//             {
//                 "cover": "CLR",
//                 "base": null
//             }
//         ]
//     }
async function fetchMetars(lat: number, lon: number, deg: number): Promise<Metar[]> {
  const bbox = `${lat - deg},${lon - deg},${lat + deg},${lon + deg}`
  const options = {
    url: `https://aviationweather.gov/api/data/metar`,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Montgolfiere/1.0',
    },
    params: { bbox: bbox, format: 'json', taf: 'false' },
    method: 'GET',
  }
  try {
    const response: HttpResponse = await Http.get(options)
    if (response.status !== 200) {
      throw new Error(`Network response was not ok: ${response.status}`)
    }
    return response.data as Metar[]
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      fullError: error,
    })
    throw error
  }
}

// 931.3 to 1066.7 hPa
const isValidQNH = (qnh: number | null | undefined): boolean => {
  if (qnh == null || qnh == undefined || typeof qnh != 'number') return false
  if (qnh < 931.3 || qnh > 1066.7) return false
  return true
}

const locationToQnh = async (location: Position | null) => {
  const lat = location?.coords?.latitude
  const lon = location?.coords?.longitude
  if (!lat || !lon) return

  // console.log(JSON.stringify(location, null, 2));

  try {
    console.log(`Extracting METARs in bbox`)

    // Fetch METARs for the nearest aerodromes
    const metars = await fetchMetars(lat, lon, degrees)
    //console.log('Retrieved METARs:', JSON.stringify(metars, null, 2));

    // Filter METARs that have valid altim readings
    const validMetars = metars.filter((metar) => isValidQNH(metar.altim))

    // Create a point for the user's location
    const userLocation = point([lon, lat])

    // Calculate distances and sort by distance
    const metarsWithDistance = validMetars.map((metar) => {
      const metarLocation = point([metar.lon, metar.lat])
      const distanceKm = distance(userLocation, metarLocation, { units: 'kilometers' })

      return {
        ...metar,
        distance: Math.round(distanceKm),
      }
    })

    // Sort by distance (closest first)
    const closestWithMetars = metarsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, numNeighbours)

    console.log(
      `Found ${closestWithMetars.length} closest METARs (out of ${metars.length}) with valid QNH data:`,
      closestWithMetars.map((m) => `${m.icaoId} (${m.distance}km, QNH: ${m.altim})`),
    )

    return closestWithMetars
  } catch (error) {
    console.error('Error in locationToQnh:', error)
    return []
  }
}

// New exported function that handles the retrieval and state updates
const updateQnhFromLocation = async (currentLocation?: Position | null): Promise<void> => {
  const targetLocation = currentLocation || location.value

  console.log(`Updating QNH from location`)
  try {
    const closestWithMetars = await locationToQnh(targetLocation)

    // Check if we have valid data before accessing it
    if (closestWithMetars && closestWithMetars.length > 0) {
      // Extract airport QNH data
      airportQnhData.value = closestWithMetars.map((metar) => ({
        icao: metar.icaoId,
        site: metar.name || metar.icaoId, // Use name as site, fallback to ICAO ID
        distance: metar.distance || 0,
        qnh: metar.altim || 0,
      }))

      console.log('Airport QNH data:', airportQnhData.value)
    } else {
      console.warn('No airports with METAR data found, keeping previous QNH value')
      airportQnhData.value = [] // Clear the array when no data
    }
  } catch (error) {
    console.error('Failed to process location for QNH:', error)
    airportQnhData.value = [] // Clear on error
    throw error // Re-throw so caller can handle if needed
  }
}

watch(locationAvailable, async (newLocationAvailable) => {
  console.log(`newLocationAvailable: ${newLocationAvailable}`)
  await updateQnhFromLocation()
})

watchEffect(() => {
  if (airportQnhData.value.length > 0 && autoQNHflag.value) {
    currentQNH.value = airportQnhData.value[0].qnh
    currentQNHsource.value = airportQnhData.value[0].icao
  } else {
    currentQNH.value = manualQNHvalue.value
    currentQNHsource.value = 'man'
  }
  console.log(`currentQNH = ${currentQNH.value} currentQNHsource = ${currentQNHsource.value}.`)
})

export {
  manualQNHvalue,
  autoQNHflag,
  currentQNH,
  currentQNHsource,
  airportQnhData,
  updateQnhFromLocation,
}

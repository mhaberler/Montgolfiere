import {
    locationAvailable,
    location
} from '../sensors/location'
import {
    Position,
} from "@capacitor/geolocation";
import { usePersistedRef } from "@/composables/usePersistedRef";

import { Http, HttpResponse } from '@leadscout/http';
import { ref, watch } from 'vue';
import { distance } from '@turf/distance';
import { point } from '@turf/helpers';

const degrees = 1;
const numNeighbours = 5;

const manualQNH = usePersistedRef<number>("manualQNH", 1013.25); // aka QNH in hPa, default is 1013.25 hPa (sea level standard atmospheric pressure)

const currentQNH = ref<number>(0);
const currentQNHsource = ref<string>('man');

// Add ref to store airport QNH data
const airportQnhData = ref<Array<{
    icao: string;
    site: string;
    distance: number;
    qnh: number;
}>>([]);

// Define interface for aerodrome data
interface Aerodrome {
    icaoId: string;
    iataId: string;
    faaId: string;
    wmoId: string;
    lat: number;
    lon: number;
    elev: number;
    site: string;
    state: string;
    country: string;
    priority: number;
    distance?: number; // Add distance property for sorting
    metar?: Metar; // Add optional METAR data
}

// Define interface for METAR data
interface Metar {
    metar_id: number;
    icaoId: string;
    receiptTime: string;
    obsTime: number;
    reportTime: string;
    temp: number;
    dewp: number;
    wdir: string;
    wspd: number;
    wgst: number | null;
    visib: string;
    altim: number;
    slp: number | null;
    qcField: number;
    wxString: string | null;
    presTend: number | null;
    maxT: number | null;
    minT: number | null;
    maxT24: number | null;
    minT24: number | null;
    precip: number | null;
    pcp3hr: number | null;
    pcp6hr: number | null;
    pcp24hr: number | null;
    snow: number | null;
    vertVis: number | null;
    metarType: string;
    rawOb: string;
    mostRecent: number;
    lat: number;
    lon: number;
    elev: number;
    prior: number;
    name: string;
    clouds: Array<{
        cover: string;
        base: number | null;
    }>;
}
// airodrome example:
// [
//     {
//         "icaoId": "LJMB",
//         "iataId": "MBX",
//         "faaId": "-",
//         "wmoId": "14026",
//         "lat": 46.48,
//         "lon": 15.682,
//         "elev": 263,
//         "site": "Maribor/Rusjan Arpt",
//         "state": "MA",
//         "country": "SI",
//         "priority": 5
//     },
//     {
//         "icaoId": "LOWG",
//         "iataId": "GRZ",
//         "faaId": "-",
//         "wmoId": "11240",
//         "lat": 46.997,
//         "lon": 15.447,
//         "elev": 337,
//         "site": "Graz Arpt",
//         "state": "ST",
//         "country": "AT",
//         "priority": 3
//     }
// ]
async function fetchAirodromeLocations(lat: number, lon: number, deg: number): Promise<Aerodrome[]> {
    const bbox = `${lat - deg},${lon - deg},${lat + deg},${lon + deg}`;
    const options = {
        url: `https://aviationweather.gov/api/data/stationinfo`,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Montgolfiere/1.0'
        },
        params: { bbox: bbox, format: 'json' },
        method: 'GET'
    };
    try {
        const response: HttpResponse = await Http.get(options);
        if (response.status !== 200) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.data as Aerodrome[];
    } catch (error: any) {
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            fullError: error
        });
        throw error;
    }
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
async function fetchMetars(icaoIds: string[]): Promise<Metar[]> {
    const idsParam = icaoIds.join(',');
    const options = {
        url: `https://aviationweather.gov/api/data/metar`,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Montgolfiere/1.0'
        },
        params: { ids: idsParam, format: 'json', taf: 'false' },
        method: 'GET'
    };
    try {
        const response: HttpResponse = await Http.get(options);
        if (response.status !== 200) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        return response.data as Metar[];

    } catch (error: any) {
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            fullError: error
        });
        throw error;
    }
}


// Function to sort aerodromes by distance
function sortAerodromesByDistance(aerodromes: Aerodrome[], userLat: number, userLon: number): Aerodrome[] {
    // Create a point for the user's location
    const userLocation = point([userLon, userLat]);

    // Calculate distance for each aerodrome and add it to the object
    const aerodromes_with_distance = aerodromes.map(aerodrome => {
        const aerodromeLocation = point([aerodrome.lon, aerodrome.lat]);
        const distanceKm = distance(userLocation, aerodromeLocation, { units: 'kilometers' });

        return {
            ...aerodrome,
            distance: Math.round(distanceKm)
        };
    });

    // Sort by distance (closest first)
    return aerodromes_with_distance.sort((a, b) => a.distance! - b.distance!);
}

// Function to extract the closest airports that have METAR data
function extractClosestAirportsWithMetars(aerodromes: Aerodrome[], count: number): Aerodrome[] {
    // Filter aerodromes that have METAR data
    const aerodromes_with_metars = aerodromes.filter(aerodrome => aerodrome.metar !== undefined);

    // Return the closest ones up to the requested count
    return aerodromes_with_metars.slice(0, count);
}

const locationToQnh = async (location: Position | null) => {
    const lat = location?.coords?.latitude;
    const lon = location?.coords?.longitude;
    if (!lat || !lon)
        return;

    // console.log(JSON.stringify(location, null, 2));

    try {
        const aerodromes = await fetchAirodromeLocations(lat, lon, degrees);
        // console.log('Raw aerodromes:', JSON.stringify(aerodromes, null, 2));

        // Sort by distance from current location
        const sortedAerodromes = sortAerodromesByDistance(aerodromes, lat, lon);
        // console.log('Sorted aerodromes by distance:', JSON.stringify(sortedAerodromes, null, 2));

        // Log the closest aerodrome
        if (sortedAerodromes.length > 0) {
            const closest = sortedAerodromes[0];
            console.log(`Closest aerodrome: ${closest.site} (${closest.icaoId}) - ${closest.distance} km away`);
        }

        // Extract ICAO IDs from the nearest aerodromes
        const nearestAerodromes = sortedAerodromes.slice(0, numNeighbours * 2);
        const icaoIds = nearestAerodromes.map(aerodrome => aerodrome.icaoId);
        console.log(`Extracting METARs for nearest ${numNeighbours} aerodromes:`, icaoIds);

        // Fetch METARs for the nearest aerodromes
        const metars = await fetchMetars(icaoIds);
        // console.log('Retrieved METARs:', JSON.stringify(metars, null, 2));

        // Create a map of METAR data by ICAO ID for quick lookup
        const metarMap = new Map<string, Metar>();
        metars.forEach(metar => {
            metarMap.set(metar.icaoId, metar);
        });

        // Merge METAR data into aerodrome objects and filter out those without METARs
        const aerodromeWithMetars = nearestAerodromes
            .map(aerodrome => ({
                ...aerodrome,
                metar: metarMap.get(aerodrome.icaoId) || undefined
            }))
            .filter(aerodrome => aerodrome.metar !== undefined);

        // console.log('Aerodromes with merged METAR data:', JSON.stringify(aerodromeWithMetars, null, 2));

        // Extract the closest airports that actually have METAR data
        const closestWithMetars = extractClosestAirportsWithMetars(aerodromeWithMetars, numNeighbours);
        console.log(`Found ${closestWithMetars.length} closest airports with METAR data:`,
            closestWithMetars.map(a => `${a.icaoId} (${a.distance}km, QNH: ${a.metar?.altim})`));

        return closestWithMetars;

    } catch (error) {
        console.error('Error in locationToQnh:', error);
        throw error;
    }
};

// New exported function that handles the retrieval and state updates
const updateQnhFromLocation = async (currentLocation?: Position | null): Promise<void> => {
    const targetLocation = currentLocation || location.value;

    console.log(`Updating QNH from location`);
    try {
        const closestWithMetars = await locationToQnh(targetLocation);

        // Check if we have valid data before accessing it
        if (closestWithMetars && closestWithMetars.length > 0 && closestWithMetars[0].metar) {

            // Extract airport QNH data
            airportQnhData.value = closestWithMetars.map(airport => ({
                icao: airport.icaoId,
                site: airport.site,
                distance: airport.distance || 0,
                qnh: airport.metar?.altim || 0
            }));

            console.log('Airport QNH data:', airportQnhData.value);
        } else {
            console.warn('No airports with METAR data found, keeping previous QNH value');
            airportQnhData.value = []; // Clear the array when no data
        }
    } catch (error) {
        console.error('Failed to process location for QNH:', error);
        airportQnhData.value = []; // Clear on error
        throw error; // Re-throw so caller can handle if needed
    }
};

watch(
    locationAvailable,
    async (newLocationAvailable) => {
        console.log(`newLocationAvailable: ${newLocationAvailable}`);
        await updateQnhFromLocation();
    }
);

watch(airportQnhData, (newairportQnhData) => {

    console.log(`airportQnhData changed.`);
    if (newairportQnhData.length > 0) {
        currentQNH.value = newairportQnhData[0].qnh;
        currentQNHsource.value = newairportQnhData[0].icao;
    } else {
        currentQNH.value = manualQNH.value;
        currentQNHsource.value = 'man';
    }
});

export {
    manualQNH,
    currentQNH,
    currentQNHsource,
    airportQnhData,
    updateQnhFromLocation
};

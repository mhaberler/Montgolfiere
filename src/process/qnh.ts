import {
    locationAvailable,
    location
} from '../sensors/location'
import {
    Position,
} from "@capacitor/geolocation";

import { Http, HttpResponse } from '@capacitor-mobi/http';
import { ref, computed, watch } from 'vue';
import { distance } from '@turf/distance';
import { point } from '@turf/helpers';

const degrees = 1;
const numNeighbours = 5;
const dynamicQNH = ref<number | null>(null);

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
    
    console.log(JSON.stringify(location, null, 2));
    
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
        const nearestAerodromes = sortedAerodromes.slice(0, numNeighbours);
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

watch(
    locationAvailable,
    async (newLocationAvailable) => {
        console.log(`newLocationAvailable: ${newLocationAvailable}`);
        try {
            const closestWithMetars = await locationToQnh(location.value);
            
            dynamicQNH.value = 42; // Set after completion
        } catch (error) {
            console.error('Failed to process location for QNH:', error);
        }
    }
);export {
    dynamicQNH
};

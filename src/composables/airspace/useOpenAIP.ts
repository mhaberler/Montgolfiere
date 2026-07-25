import type { FeatureCollection, Geometry } from "geojson";
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  icaoClassName,
  airspaceTypeName,
  activityName,
} from "@/airspace/airspaceStack";
import {
  airportPopupHtml as buildAirportPopupHtml,
  airportTypeName as getAirportTypeName,
  formatAltitude,
  toFeet,
  activeFlags,
  isActive,
  type AirspaceItem,
  type AirportItem,
} from "@/airspace/markerCallback";

// OpenAIP rejects dist > 50_000 with HTTP 400
export const AIRPORT_FETCH_RADIUS_M = 50_000;
export const AIRSPACE_REFETCH_THRESHOLD_M = 10_000;
export const AIRPORT_REFETCH_THRESHOLD_M = AIRPORT_FETCH_RADIUS_M / 2;
const AIRSPACE_DIST_METERS = 10;

const API_KEY = import.meta.env.VITE_OPENAIP_KEY as string;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AirspaceLookup {
  popupText: string;
  geojson: FeatureCollection<Geometry> | null;
}

export { type AirportItem };
export const airportPopupHtml = buildAirportPopupHtml;
export const airportTypeName = getAirportTypeName;

function haversineM(a: LatLng, b: LatLng): number {
  const r = 6_371_000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function useOpenAIP() {
  const online = ref(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const onOnline = () => {
    online.value = true;
  };
  const onOffline = () => {
    online.value = false;
  };

  onMounted(() => {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  });

  let lastAirspaceFetchCenter: LatLng | null = null;
  let lastAirportFetchCenter: LatLng | null = null;
  let airportRefreshInFlight = false;
  let pendingAirportRefreshCenter: LatLng | null = null;

  async function fetchAirspaceAt(
    lat: number,
    lng: number,
  ): Promise<AirspaceLookup> {
    const url = `https://api.core.openaip.net/api/airspaces?pos=${lat},${lng}&dist=${AIRSPACE_DIST_METERS}&apiKey=${API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      const items: AirspaceItem[] = data.items ?? [];
      items.sort(
        (left, right) =>
          (left.lowerLimit ? toFeet(left.lowerLimit) : 0) -
          (right.lowerLimit ? toFeet(right.lowerLimit) : 0),
      );

      const popupText = items.length
        ? items
            .map((airspace) => {
              const lower = airspace.lowerLimit
                ? formatAltitude(airspace.lowerLimit)
                : "?";
              const upper = airspace.upperLimit
                ? formatAltitude(airspace.upperLimit)
                : "?";
              const { active, reason } = airspace.hoursOfOperation
                ? isActive(airspace.hoursOfOperation, lat, lng)
                : { active: true, reason: "24h" };
              const status = active
                ? `<span style="color:green">ACTIVE</span> (${reason})`
                : `<span style="color:grey">INACTIVE</span> (${reason})`;
              const activity = airspace.activity
                ? ` – ${activityName(airspace.activity)}`
                : "";
              const flags = activeFlags(airspace);
              const flagsHtml = flags.length ? ` [${flags.join(", ")}]` : "";
              return `<b>${airspace.name}</b> (${airspaceTypeName(airspace.type)}, ${icaoClassName(airspace.icaoClass)}${activity}) — ${lower} / ${upper} — ${status}${flagsHtml}`;
            })
            .join("<br>")
        : `No airspaces within ${AIRSPACE_DIST_METERS} m`;

      const geojson: FeatureCollection<Geometry> = {
        type: "FeatureCollection",
        features: items
          .filter((airspace) => airspace.geometry)
          .map((airspace) => {
            const { active, reason } = airspace.hoursOfOperation
              ? isActive(airspace.hoursOfOperation, lat, lng)
              : { active: true, reason: "24h" };
            return {
              type: "Feature" as const,
              geometry: airspace.geometry,
              properties: {
                name: airspace.name,
                type: airspace.type,
                icaoClass: airspace.icaoClass,
                lowerLabel: airspace.lowerLimit
                  ? formatAltitude(airspace.lowerLimit)
                  : "?",
                upperLabel: airspace.upperLimit
                  ? formatAltitude(airspace.upperLimit)
                  : "?",
                lowerFt: airspace.lowerLimit ? toFeet(airspace.lowerLimit) : 0,
                upperFt: airspace.upperLimit ? toFeet(airspace.upperLimit) : 0,
                ...(airspace.activity ? { activity: airspace.activity } : {}),
                flags: activeFlags(airspace),
                activeReason: reason,
                active,
              },
            };
          }),
      };

      lastAirspaceFetchCenter = { lat, lng };
      return { popupText, geojson };
    } catch (error) {
      console.error("OpenAIP error:", error);
      const message = !navigator.onLine
        ? "Offline — no cached data for this location"
        : `Error: ${error}`;
      return { popupText: message, geojson: null };
    }
  }

  async function fetchAirportsAt(
    lat: number,
    lng: number,
  ): Promise<AirportItem[]> {
    const url = `https://api.core.openaip.net/api/airports?pos=${lat},${lng}&dist=${AIRPORT_FETCH_RADIUS_M}&apiKey=${API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return (data.items as AirportItem[]).filter(
        (airport) => airport.frequencies?.length,
      );
    } catch (error) {
      console.error("Airport fetch error:", error);
      return [];
    }
  }

  function needsAirspaceRefetch(center: LatLng): boolean {
    if (lastAirspaceFetchCenter === null) {
      return true;
    }
    return (
      haversineM(lastAirspaceFetchCenter, center) > AIRSPACE_REFETCH_THRESHOLD_M
    );
  }

  function needsAirportRefetch(center: LatLng): boolean {
    if (lastAirportFetchCenter === null) {
      return true;
    }
    return (
      haversineM(lastAirportFetchCenter, center) > AIRPORT_REFETCH_THRESHOLD_M
    );
  }

  async function refetchAirportsIfNeeded(
    center: LatLng,
    onFetched: (airports: AirportItem[], center: LatLng) => void,
  ): Promise<void> {
    if (lastAirportFetchCenter) {
      const distance = haversineM(lastAirportFetchCenter, center);
      if (distance <= AIRPORT_REFETCH_THRESHOLD_M) {
        return;
      }
    }

    if (airportRefreshInFlight) {
      pendingAirportRefreshCenter = center;
      return;
    }

    airportRefreshInFlight = true;
    try {
      const airports = await fetchAirportsAt(center.lat, center.lng);
      lastAirportFetchCenter = center;
      onFetched(airports, center);
    } finally {
      airportRefreshInFlight = false;
      if (pendingAirportRefreshCenter) {
        const pending = pendingAirportRefreshCenter;
        pendingAirportRefreshCenter = null;
        void refetchAirportsIfNeeded(pending, onFetched);
      }
    }
  }

  function resetAirspaceCenter(): void {
    lastAirspaceFetchCenter = null;
  }

  function resetAirportCenter(): void {
    lastAirportFetchCenter = null;
  }

  return {
    online,
    fetchAirspaceAt,
    fetchAirportsAt,
    needsAirspaceRefetch,
    needsAirportRefetch,
    refetchAirportsIfNeeded,
    resetAirspaceCenter,
    resetAirportCenter,
  };
}

import type { FeatureCollection, Geometry } from "geojson";
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  icaoClassName,
  airspaceTypeName,
  activityName,
} from "@/airspace/airspaceStack";
import { containsPoint } from "@/airspace/pointInPolygon";
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
import {
  ageDays,
  cellCenter,
  cellKey,
  getRegion,
  isStale,
  putRegion,
  type RegionEntry,
} from "./airspaceCache";

// OpenAIP rejects dist > 50_000 with HTTP 400
export const AIRPORT_FETCH_RADIUS_M = 50_000;
export const AIRSPACE_FETCH_RADIUS_M = 50_000;
export const AIRSPACE_REFETCH_THRESHOLD_M = 10_000;
export const AIRPORT_REFETCH_THRESHOLD_M = AIRPORT_FETCH_RADIUS_M / 2;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

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
  let rateLimitedUntil = 0;

  function rateLimitMessage(): string {
    const secs = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
    return `OpenAIP rate limited — retry in ${secs}s`;
  }

  /**
   * Fetch one region from OpenAIP. Returns null on any failure, arming the
   * rate-limit cooldown when the failure could be a 429 (whose CORS-less
   * response the browser reports as an opaque "Failed to fetch").
   */
  async function fetchRegion<T>(
    endpoint: "airspaces" | "airports",
    center: LatLng,
    radiusM: number,
    ignoreCooldown = false,
  ): Promise<T[] | null> {
    if (!ignoreCooldown && Date.now() < rateLimitedUntil) {
      return null;
    }

    const url = `https://api.core.openaip.net/api/${endpoint}?pos=${center.lat},${center.lng}&dist=${radiusM}&apiKey=${API_KEY}`;

    try {
      const response = await fetch(url);
      if (response.status === 429) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        return null;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return (data.items ?? []) as T[];
    } catch (error) {
      console.error(`OpenAIP ${endpoint} fetch failed:`, error);
      if (navigator.onLine) {
        rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      }
      return null;
    }
  }

  /**
   * Resolve a region cache-first: fresh cache wins, a stale entry is served
   * immediately while a refresh runs in the background, and a miss falls
   * through to the network.
   */
  async function resolveRegion<T>(
    kind: "airspace" | "airport",
    endpoint: "airspaces" | "airports",
    lat: number,
    lng: number,
    radiusM: number,
  ): Promise<RegionEntry<T> | null> {
    const key = cellKey(kind, lat, lng);
    const cached = await getRegion<T>(key);

    if (cached && !isStale(cached)) {
      return cached;
    }

    if (cached && !navigator.onLine) {
      return cached;
    }

    const center = cellCenter(lat, lng);
    const items = await fetchRegion<T>(endpoint, center, radiusM);
    if (items) {
      await putRegion(key, kind, items);
      return await getRegion<T>(key);
    }

    return cached;
  }

  /** Prefix warning shown when the only data available is past its AIRAC TTL. */
  function stalePrefix(entry: RegionEntry): string {
    return isStale(entry)
      ? `<b style="color:#b45309">⚠ cached data ${ageDays(entry)} d old</b><br>`
      : "";
  }

  async function fetchAirspaceAt(
    lat: number,
    lng: number,
  ): Promise<AirspaceLookup> {
    const region = await resolveRegion<AirspaceItem>(
      "airspace",
      "airspaces",
      lat,
      lng,
      AIRSPACE_FETCH_RADIUS_M,
    );

    if (!region) {
      const message = !navigator.onLine
        ? "Offline — no cached data for this location"
        : rateLimitMessage();
      return { popupText: message, geojson: null };
    }

    {
      // The cached region covers the whole cell; narrow it to the airspaces
      // actually containing this position.
      const items = region.items.filter((airspace) =>
        containsPoint(airspace.geometry, lat, lng),
      );
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
        : "No airspaces at this position";

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
      return { popupText: `${stalePrefix(region)}${popupText}`, geojson };
    }
  }

  async function fetchAirportsAt(
    lat: number,
    lng: number,
  ): Promise<AirportItem[]> {
    const region = await resolveRegion<AirportItem>(
      "airport",
      "airports",
      lat,
      lng,
      AIRPORT_FETCH_RADIUS_M,
    );

    return (region?.items ?? []).filter(
      (airport) => airport.frequencies?.length,
    );
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

  /**
   * Pre-flight download: force-fetch and cache both regions covering a
   * position, ignoring any existing cache entry.
   */
  async function downloadRegion(
    center: LatLng,
  ): Promise<{ airspaces: number; airports: number }> {
    if (!navigator.onLine) {
      throw new Error("Offline — cannot download");
    }

    const fetchCenter = cellCenter(center.lat, center.lng);

    // An explicit user action bypasses the cooldown, so one endpoint failing
    // does not silently skip the other.
    const [airspaces, airports] = await Promise.all([
      fetchRegion<AirspaceItem>(
        "airspaces",
        fetchCenter,
        AIRSPACE_FETCH_RADIUS_M,
        true,
      ),
      fetchRegion<AirportItem>(
        "airports",
        fetchCenter,
        AIRPORT_FETCH_RADIUS_M,
        true,
      ),
    ]);

    if (airspaces) {
      await putRegion(
        cellKey("airspace", center.lat, center.lng),
        "airspace",
        airspaces,
      );
    }
    if (airports) {
      await putRegion(
        cellKey("airport", center.lat, center.lng),
        "airport",
        airports,
      );
    }

    // Report a partial failure as a failure — a "0 airspaces" success message
    // would read as "this area has no airspaces".
    const failed = [
      airspaces ? null : "airspaces",
      airports ? null : "airports",
    ].filter(Boolean);
    if (failed.length) {
      throw new Error(
        `${failed.join(" and ")} unavailable (${rateLimitMessage()})`,
      );
    }

    return {
      airspaces: airspaces?.length ?? 0,
      airports: airports?.length ?? 0,
    };
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
    downloadRegion,
    resetAirspaceCenter,
    resetAirportCenter,
  };
}

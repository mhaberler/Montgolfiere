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
  countriesAt,
  countriesInBounds,
  coverageOf,
  itemsFor,
  type Bounds,
} from "./useCountryData";

/**
 * Distance the map may move before airspace/airports are recomputed. Purely a
 * render throttle now — the data is local, so these are cheap.
 */
export const AIRSPACE_REFETCH_THRESHOLD_M = 10_000;
export const AIRPORT_REFETCH_THRESHOLD_M = 25_000;

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

/** Build the display feature for one airspace, at a position for the active test. */
function airspaceFeature(airspace: AirspaceItem, lat: number, lng: number) {
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

  /**
   * Explain a lookup that returned nothing.
   *
   * "No airspaces here" and "this country was never downloaded" must never read
   * the same: one says the air is clear, the other says we do not know.
   */
  async function coverageMessage(lat: number, lng: number): Promise<string> {
    const countries = countriesAt(lat, lng);
    if (!countries.length) {
      return "Outside openAIP coverage";
    }

    const missing: string[] = [];
    for (const country of countries) {
      const coverage = await coverageOf(country, "asp");
      if (coverage === "missing") {
        missing.push(country.toUpperCase());
      }
    }
    if (missing.length) {
      return `No airspace data — download ${missing.map((c) => `'${c}'`).join(" or ")} for offline use`;
    }
    return `openAIP publishes no airspace here (${countries
      .map((c) => c.toUpperCase())
      .join(", ")})`;
  }

  /** Airspaces containing a point, from the locally held country. */
  async function airspacesAt(
    lat: number,
    lng: number,
  ): Promise<AirspaceItem[] | null> {
    // Every country whose box covers the point, not just the closest: airspace
    // crosses borders, and a German CTR can reach over Austrian ground.
    const countries = countriesAt(lat, lng);
    if (!countries.length) {
      return null;
    }

    const found: AirspaceItem[] = [];
    for (const country of countries) {
      // A country that publishes airspace but is not downloaded leaves a real
      // gap. Reporting "no airspaces" then would claim clear air we cannot
      // see, so any gap makes the whole lookup a coverage failure.
      if ((await coverageOf(country, "asp")) === "missing") {
        return null;
      }
      found.push(
        ...(await itemsFor<AirspaceItem>(country, "asp")).filter((airspace) =>
          containsPoint(airspace.geometry, lat, lng),
        ),
      );
    }
    return found;
  }

  async function fetchAirspaceAt(
    lat: number,
    lng: number,
  ): Promise<AirspaceLookup> {
    const found = await airspacesAt(lat, lng);

    if (found === null) {
      return { popupText: await coverageMessage(lat, lng), geojson: null };
    }

    const items = [...found].sort(
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
        .map((airspace) => airspaceFeature(airspace, lat, lng)),
    };

    lastAirspaceFetchCenter = { lat, lng };
    return { popupText, geojson };
  }

  /**
   * All airspace intersecting the viewport, for the map overlay.
   *
   * Holding the whole country makes this free, and the airspace a balloon is
   * about to drift into matters more than the one it is already inside.
   */
  async function airspacesInBounds(
    bounds: Bounds,
  ): Promise<FeatureCollection<Geometry>> {
    const center = {
      lat: (bounds.minLat + bounds.maxLat) / 2,
      lng: (bounds.minLng + bounds.maxLng) / 2,
    };
    const features = [];

    // One store read per country, not a coverage probe plus a read: this runs
    // on every pan, across every country in view.
    for (const country of countriesInBounds(bounds)) {
      for (const airspace of await itemsFor<AirspaceItem>(country, "asp")) {
        if (
          !airspace.geometry ||
          !intersectsBounds(airspace.geometry, bounds)
        ) {
          continue;
        }
        features.push(airspaceFeature(airspace, center.lat, center.lng));
      }
    }

    return { type: "FeatureCollection", features };
  }

  async function fetchAirportsAt(
    lat: number,
    lng: number,
  ): Promise<AirportItem[]> {
    const airports: AirportItem[] = [];
    for (const country of countriesAt(lat, lng)) {
      const items = await itemsFor<AirportItem>(country, "apt");
      airports.push(...items.filter((airport) => airport.frequencies?.length));
    }
    return airports;
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
    airspacesInBounds,
    needsAirspaceRefetch,
    needsAirportRefetch,
    refetchAirportsIfNeeded,
    resetAirspaceCenter,
    resetAirportCenter,
  };
}

/** Cheap bbox rejection so the viewport overlay does not test every polygon. */
function intersectsBounds(geometry: Geometry, bounds: Bounds): boolean {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visit = (coordinates: unknown): void => {
    if (typeof (coordinates as number[])[0] === "number") {
      const [lng, lat] = coordinates as number[];
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    for (const child of coordinates as unknown[]) {
      visit(child);
    }
  };

  const coordinates = (geometry as { coordinates?: unknown }).coordinates;
  if (!coordinates) {
    return false;
  }
  visit(coordinates);

  return (
    minLng <= bounds.maxLng &&
    maxLng >= bounds.minLng &&
    minLat <= bounds.maxLat &&
    maxLat >= bounds.minLat
  );
}

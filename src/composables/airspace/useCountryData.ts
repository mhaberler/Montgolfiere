/**
 * Per-country openAIP GeoJSON downloads — the app's primary airspace source.
 *
 * openAIP publishes complete country exports at a stable public URL. Whole
 * countries replace the old 0.25-degree REST region cache: one download covers
 * a whole flight, works offline, and needs no API key.
 *
 * Fetches go through @leadscout/http, not fetch(): the export bucket sends no
 * CORS headers at all (OPTIONS returns 403), so only the native HTTP client can
 * read it on device. Same pattern as the METAR fetch in src/process/qnh.ts.
 */
import { ref } from "vue";
import { Capacitor } from "@capacitor/core";
import { Http } from "@leadscout/http";
import type { AirspaceItem, AirportItem } from "@/airspace/markerCallback";
import countryIndex from "@/assets/openaip-countries.json";
import {
  countryKey,
  deleteCountry,
  getCountry,
  listCountries,
  putCountry,
  type CountryEntry,
  type CountryLayer,
} from "./airspaceCache";

const BUCKET = "https://storage.openaip.net/openaip-system-exports";

/** Dev server proxies this prefix; the bucket's missing CORS headers block fetch() on web. */
const DEV_PREFIX = "/openaip-exports";

/** openAIP publishes on the AIRAC cycle; the bucket declares max-age=86400. */
const REVALIDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface CountryInfo {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  layers: Partial<Record<CountryLayer, number>>; // layer -> bytes, absent = not published
}

const INDEX = countryIndex as unknown as Record<string, CountryInfo>;

export type Bounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/**
 * Coverage of one country layer.
 *
 * "unpublished" is deliberately distinct from "missing": openAIP publishes no
 * airspace export for 110 of its 239 countries (Liechtenstein among them), and
 * reporting that as "no airspace here" would be a lie about clear air.
 */
export type Coverage = "ready" | "missing" | "unpublished";

const downloading = ref<Set<string>>(new Set());
export const isDownloading = ref(false);

function exportUrl(country: string, layer: CountryLayer): string {
  // The dev proxy exists only to give the browser a same-origin path around
  // the bucket's missing CORS headers. Native HTTP has no CORS to work around
  // and cannot resolve a relative URL (MalformedURLException), so on device it
  // always gets the absolute one — dev build or not.
  const base =
    import.meta.env.DEV && !Capacitor.isNativePlatform() ? DEV_PREFIX : BUCKET;
  return `${base}/${country}_${layer}.geojson`;
}

/**
 * Longitude overlap, honouring antimeridian-wrapped boxes.
 *
 * A country crossing 180 degrees (us, ru, nz, fj) is stored with minLng >
 * maxLng. Treating that as a plain interval would make its box span the globe
 * and match every viewport on Earth.
 */
function lngOverlaps(minLng: number, maxLng: number, bounds: Bounds): boolean {
  const wraps = minLng > maxLng;
  const boundsWrap = bounds.minLng > bounds.maxLng;
  if (!wraps && !boundsWrap) {
    return minLng <= bounds.maxLng && maxLng >= bounds.minLng;
  }
  // Split each wrapped range at the antimeridian and test the pieces.
  const spans = (lo: number, hi: number): [number, number][] =>
    lo > hi
      ? [
          [lo, 180],
          [-180, hi],
        ]
      : [[lo, hi]];
  return spans(minLng, maxLng).some(([aLo, aHi]) =>
    spans(bounds.minLng, bounds.maxLng).some(
      ([bLo, bHi]) => aLo <= bHi && aHi >= bLo,
    ),
  );
}

/** Countries whose bbox intersects the viewport. */
export function countriesInBounds(bounds: Bounds): string[] {
  return Object.entries(INDEX)
    .filter(([, info]) => {
      const [minLng, minLat, maxLng, maxLat] = info.bbox;
      return (
        minLat <= bounds.maxLat &&
        maxLat >= bounds.minLat &&
        lngOverlaps(minLng, maxLng, bounds)
      );
    })
    .map(([country]) => country);
}

/**
 * Countries whose bbox contains a point, smallest box first.
 *
 * Country bboxes overlap heavily — a point in Liechtenstein sits inside the
 * boxes of AT, CH and FR — so a point can legitimately be served by several.
 * Smallest-first puts the most specific candidate ahead of the continental
 * ones. Callers must consider all of them: airspace genuinely crosses borders,
 * and picking just one silently drops a neighbouring CTR.
 */
export function countriesAt(lat: number, lng: number): string[] {
  const hits = countriesInBounds({
    minLat: lat,
    maxLat: lat,
    minLng: lng,
    maxLng: lng,
  });
  const area = (country: string): number => {
    const [minLng, minLat, maxLng, maxLat] = INDEX[country].bbox;
    const width = minLng > maxLng ? 360 - minLng + maxLng : maxLng - minLng;
    return width * (maxLat - minLat);
  };
  return hits.sort((a, b) => area(a) - area(b));
}

/** Most specific country covering a point, or null when outside coverage. */
export function countryAt(lat: number, lng: number): string | null {
  return countriesAt(lat, lng)[0] ?? null;
}

export function publishedLayers(country: string): CountryLayer[] {
  return Object.keys(INDEX[country]?.layers ?? {}) as CountryLayer[];
}

export function estimatedBytes(
  countries: string[],
  layers: CountryLayer[],
): number {
  return countries.reduce((total, country) => {
    const published = INDEX[country]?.layers ?? {};
    return (
      total + layers.reduce((sum, layer) => sum + (published[layer] ?? 0), 0)
    );
  }, 0);
}

export async function coverageOf(
  country: string,
  layer: CountryLayer,
): Promise<Coverage> {
  if (!INDEX[country]?.layers[layer]) {
    return "unpublished";
  }
  const entry = await getCountry(countryKey(country, layer));
  return entry ? "ready" : "missing";
}

function headerOf(
  headers: Record<string, string>,
  name: string,
): string | null {
  const match = Object.keys(headers).find(
    (key) => key.toLowerCase() === name.toLowerCase(),
  );
  return match ? headers[match] : null;
}

/**
 * Download one country layer, or confirm the held copy is current.
 *
 * Sends If-None-Match when a copy exists: a 304 is ~200 bytes and distinguishes
 * "old but still current" from "genuinely stale", which an age check cannot.
 */
async function fetchLayer(
  country: string,
  layer: CountryLayer,
  force: boolean,
): Promise<void> {
  const key = countryKey(country, layer);
  const existing = await getCountry(key);

  const url = exportUrl(country, layer);
  const now = Date.now();

  // Revalidate with a separate HEAD rather than a conditional GET: a 304 has an
  // empty body, and the native HTTP plugin throws JSONException trying to parse
  // it as JSON before the status is ever inspected. HEAD gives the same ETag
  // comparison for the same ~200 bytes, without a body to misparse.
  if (existing?.etag && !force) {
    try {
      const head = await Http.request({
        url,
        method: "HEAD",
        connectTimeout: 30_000,
        readTimeout: 30_000,
      });
      const currentEtag = headerOf(head.headers ?? {}, "etag");
      if (head.status === 200 && currentEtag && currentEtag === existing.etag) {
        await putCountry({ ...existing, lastCheckedAt: now });
        return;
      }
    } catch (error) {
      // A failed revalidation must not lose the held copy; fall through to a
      // full download, which will either refresh it or throw.
      console.warn(`revalidate HEAD ${country}_${layer} failed:`, error);
    }
  }

  const response = await Http.get({
    url,
    headers: { Accept: "application/geo+json" },
    responseType: "json",
    connectTimeout: 30_000,
    readTimeout: 120_000,
  });

  if (response.status !== 200) {
    throw new Error(`${country}_${layer}: HTTP ${response.status}`);
  }

  const body =
    typeof response.data === "string"
      ? (JSON.parse(response.data) as { features?: unknown[] })
      : (response.data as { features?: unknown[] });

  const features = body?.features;
  if (!Array.isArray(features)) {
    throw new Error(`${country}_${layer}: unexpected export shape`);
  }

  // The exports carry GeoJSON Features; the app's item interfaces expect
  // geometry alongside the properties, which is how the REST API shaped them.
  const items = features.map((feature) => {
    const { geometry, properties } = feature as {
      geometry: unknown;
      properties: Record<string, unknown>;
    };
    return { ...properties, geometry };
  });

  const entry: CountryEntry<unknown> = {
    key,
    country,
    layer,
    items,
    etag: headerOf(response.headers ?? {}, "etag"),
    lastModified: headerOf(response.headers ?? {}, "last-modified"),
    fetchedAt: now,
    lastCheckedAt: now,
    sizeBytes: JSON.stringify(items).length,
  };
  await putCountry(entry);
}

/**
 * Download every published layer of a country.
 *
 * A partial result is reported as failure: a country holding airports but
 * silently missing airspace would render as clear air.
 */
export async function downloadCountry(
  country: string,
  layers: CountryLayer[] = ["asp", "apt"],
  force = false,
): Promise<void> {
  const published = layers.filter((layer) => INDEX[country]?.layers[layer]);
  if (!published.length) {
    throw new Error(`openAIP publishes no data for '${country}'`);
  }

  downloading.value.add(country);
  isDownloading.value = true;
  try {
    const results = await Promise.allSettled(
      published.map((layer) => fetchLayer(country, layer, force)),
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      throw new Error(
        failed
          .map((r) => String((r as PromiseRejectedResult).reason))
          .join("; "),
      );
    }
  } finally {
    downloading.value.delete(country);
    isDownloading.value = downloading.value.size > 0;
  }
}

export async function downloadCountries(
  countries: string[],
  layers: CountryLayer[] = ["asp", "apt"],
): Promise<{ ok: string[]; failed: { country: string; error: string }[] }> {
  const ok: string[] = [];
  const failed: { country: string; error: string }[] = [];
  for (const country of countries) {
    try {
      await downloadCountry(country, layers);
      ok.push(country);
    } catch (error) {
      failed.push({ country, error: String(error) });
    }
  }
  return { ok, failed };
}

/** Read a stored layer. Returns [] when the country is not downloaded. */
export async function itemsFor<T = AirspaceItem | AirportItem>(
  country: string,
  layer: CountryLayer,
): Promise<T[]> {
  const entry = await getCountry<T>(countryKey(country, layer));
  return entry?.items ?? [];
}

/**
 * Refresh held countries whose validators are older than the bucket's own
 * max-age. Skipped on a metered connection: this runs on foreground, and
 * ballooning happens away from wifi.
 */
export async function revalidateHeld(): Promise<void> {
  if (!navigator.onLine) {
    return;
  }
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; type?: string };
    }
  ).connection;
  if (connection?.saveData || connection?.type === "cellular") {
    return;
  }

  const now = Date.now();
  for (const entry of await listCountries()) {
    if (now - entry.lastCheckedAt < REVALIDATE_INTERVAL_MS) {
      continue;
    }
    try {
      await fetchLayer(entry.country, entry.layer, false);
    } catch (error) {
      console.warn(`revalidate ${entry.key} failed:`, error);
    }
  }
}

export { listCountries, deleteCountry };

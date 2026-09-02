/**
 * Shared IndexedDB layer for offline airspace data.
 *
 * This module owns the schema for the "airspace-cache" database. Three stores:
 *
 *   countries  per-country GeoJSON exports (airspace/airports) — the primary
 *              offline data source, written by useCountryData.ts
 *   tiles      raster map tile blobs, written by tileCache.ts
 *
 * The per-cell "regions" store that backed the old OpenAIP REST cache is
 * dropped in v3: whole-country downloads supersede it.
 */

import { ref } from "vue";

const DB_NAME = "airspace-cache";
const DB_VERSION = 3;
const COUNTRY_STORE = "countries";
const TILE_STORE = "tiles";
const LEGACY_REGION_STORE = "regions";

/** openAIP export layers this app consumes. Extensible: add a code here and a consumer. */
export type CountryLayer = "asp" | "apt";

export interface CountryEntry<T = unknown> {
  key: string; // `${country}:${layer}`, e.g. "de:asp"
  country: string;
  layer: CountryLayer;
  items: T[];
  /** Validators from the export bucket, for conditional revalidation. */
  etag: string | null;
  lastModified: string | null;
  /** When the body was last actually downloaded. */
  fetchedAt: number;
  /** When it was last confirmed current — advanced by a 304, throttles refresh. */
  lastCheckedAt: number;
  sizeBytes: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function countryKey(country: string, layer: CountryLayer): string {
  return `${country}:${layer}`;
}

/**
 * A DB that opened at the right version but is missing a store cannot be
 * repaired by reopening — only by deleting and recreating it. Caches are
 * disposable, so that is safe; the alternative is every read failing forever.
 */
async function recreateDb(): Promise<IDBDatabase> {
  dbPromise = null;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  return openDb();
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(COUNTRY_STORE)) {
          const countries = db.createObjectStore(COUNTRY_STORE, {
            keyPath: "key",
          });
          countries.createIndex("country", "country");
        }
        if (!db.objectStoreNames.contains(TILE_STORE)) {
          const tiles = db.createObjectStore(TILE_STORE, { keyPath: "key" });
          tiles.createIndex("lastAccess", "lastAccess");
        }
        // The 0.25-degree REST region cache has no successor; whole countries
        // answer any point the cells used to.
        if (db.objectStoreNames.contains(LEGACY_REGION_STORE)) {
          db.deleteObjectStore(LEGACY_REGION_STORE);
        }
      };

      // Both this module and tileCache.ts hold their own connection to this
      // DB. Without these, a version bump deadlocks behind the other one.
      request.onblocked = () => {
        console.warn("airspace-cache upgrade blocked by another connection");
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        if (
          !db.objectStoreNames.contains(COUNTRY_STORE) ||
          !db.objectStoreNames.contains(TILE_STORE)
        ) {
          console.warn("airspace-cache schema incomplete; recreating");
          db.close();
          recreateDb().then(resolve, reject);
          return;
        }
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export { openDb };

export function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Whether the browser has promised not to evict this origin. */
export const storagePersisted = ref(false);

/**
 * Ask the browser not to evict this origin under storage pressure.
 *
 * Without it the whole cache — hundreds of MB of tiles included — is fair game
 * for eviction exactly when it matters: offline, mid-flight.
 *
 * Browsers grant this on engagement signals (installed/bookmarked, high site
 * engagement, notification permission), so a fresh dev origin is refused
 * without prompting. That is a downgrade, not a failure: caches still work,
 * they are just evictable, so the app reports it rather than retrying.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) {
      return false;
    }
    const granted =
      (await navigator.storage.persisted()) ||
      (await navigator.storage.persist());
    storagePersisted.value = granted;
    return granted;
  } catch (error) {
    console.warn("persistent storage request failed:", error);
    return false;
  }
}

/** Bytes the browser will let this origin use, when it will say. */
export async function storageQuota(): Promise<{
  usage: number;
  quota: number;
} | null> {
  try {
    if (!navigator.storage?.estimate) {
      return null;
    }
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage ?? 0, quota: quota ?? 0 };
  } catch {
    return null;
  }
}

/** Bytes currently held, per store, for the Settings storage readout. */
export async function storageUsage(): Promise<{
  countries: number;
  tiles: number;
}> {
  const db = await openDb();
  const sum = async (store: string): Promise<number> => {
    const entries = (await promisify(
      db.transaction(store, "readonly").objectStore(store).getAll(),
    )) as { sizeBytes?: number }[];
    return entries.reduce((total, entry) => total + (entry.sizeBytes ?? 0), 0);
  };
  return { countries: await sum(COUNTRY_STORE), tiles: await sum(TILE_STORE) };
}

/** Log a repeated cache failure once, not once per lookup. */
let readFailureLogged = false;

export async function getCountry<T>(
  key: string,
): Promise<CountryEntry<T> | null> {
  try {
    const db = await openDb();
    const entry = (await promisify(
      db
        .transaction(COUNTRY_STORE, "readonly")
        .objectStore(COUNTRY_STORE)
        .get(key),
    )) as CountryEntry<T> | undefined;
    readFailureLogged = false;
    return entry ?? null;
  } catch (error) {
    if (!readFailureLogged) {
      readFailureLogged = true;
      console.error("countryStore read failed:", error);
    }
    return null;
  }
}

/** Every stored country layer, for the Settings list. */
export async function listCountries(): Promise<CountryEntry[]> {
  try {
    const db = await openDb();
    return (await promisify(
      db
        .transaction(COUNTRY_STORE, "readonly")
        .objectStore(COUNTRY_STORE)
        .getAll(),
    )) as CountryEntry[];
  } catch (error) {
    console.error("countryStore list failed:", error);
    return [];
  }
}

/**
 * Store one downloaded country layer.
 *
 * Throws on quota exhaustion rather than logging and continuing: a silently
 * half-written country would read as "no airspace here".
 */
export async function putCountry<T>(entry: CountryEntry<T>): Promise<void> {
  const db = await openDb();
  try {
    await promisify(
      db
        .transaction(COUNTRY_STORE, "readwrite")
        .objectStore(COUNTRY_STORE)
        .put(entry),
    );
  } catch (error) {
    if ((error as DOMException)?.name === "QuotaExceededError") {
      throw new Error(
        "Out of storage space — free space or delete a downloaded country",
        { cause: error },
      );
    }
    throw error;
  }
}

/** Update validators after a 304, without rewriting the (unchanged) items. */
export async function touchCountry(
  key: string,
  lastCheckedAt: number,
): Promise<void> {
  const existing = await getCountry(key);
  if (existing) {
    await putCountry({ ...existing, lastCheckedAt });
  }
}

export async function deleteCountry(country: string): Promise<void> {
  const db = await openDb();
  const store = db
    .transaction(COUNTRY_STORE, "readwrite")
    .objectStore(COUNTRY_STORE);
  const keys = await promisify(store.index("country").getAllKeys(country));
  for (const key of keys) {
    store.delete(key);
  }
}

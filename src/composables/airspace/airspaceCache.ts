/**
 * IndexedDB cache for OpenAIP region responses.
 *
 * Airspace and airport items are stored per grid cell so that a cached region
 * can answer any point lookup inside it, online or offline.
 */

const DB_NAME = "airspace-cache";
const DB_VERSION = 2;
const STORE = "regions";
const TILE_STORE = "tiles";
const SIZE_LIMIT_BYTES = 50 * 1024 * 1024;

export const REGION_TTL_MS = 28 * 24 * 60 * 60 * 1000; // AIRAC cycle

export type RegionKind = "airspace" | "airport";

export interface RegionEntry<T = unknown> {
  key: string;
  kind: RegionKind;
  items: T[];
  fetchedAt: number;
  lastAccess: number;
  sizeBytes: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("lastAccess", "lastAccess");
        }
        if (!db.objectStoreNames.contains(TILE_STORE)) {
          const tiles = db.createObjectStore(TILE_STORE, { keyPath: "key" });
          tiles.createIndex("lastAccess", "lastAccess");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Grid cell key for a position. Cells are 0.25°; a 50 km fetch radius covers one fully. */
export const CELL_DEGREES = 0.25;

export function cellKey(kind: RegionKind, lat: number, lng: number): string {
  const cellLat = Math.floor(lat / CELL_DEGREES) * CELL_DEGREES;
  const cellLng = Math.floor(lng / CELL_DEGREES) * CELL_DEGREES;
  return `${kind}:${cellLat.toFixed(2)},${cellLng.toFixed(2)}`;
}

/** Center of the cell a position falls into — the point a region fetch is made around. */
export function cellCenter(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  return {
    lat: Math.floor(lat / CELL_DEGREES) * CELL_DEGREES + CELL_DEGREES / 2,
    lng: Math.floor(lng / CELL_DEGREES) * CELL_DEGREES + CELL_DEGREES / 2,
  };
}

export function isStale(entry: RegionEntry): boolean {
  return Date.now() - entry.fetchedAt > REGION_TTL_MS;
}

export function ageDays(entry: RegionEntry): number {
  return Math.floor((Date.now() - entry.fetchedAt) / (24 * 60 * 60 * 1000));
}

/** Read a cached region, refreshing its LRU stamp. Returns null when absent. */
export async function getRegion<T>(
  key: string,
): Promise<RegionEntry<T> | null> {
  try {
    const db = await openDb();
    const entry = await promisify(
      db.transaction(STORE, "readonly").objectStore(STORE).get(key),
    );
    if (!entry) {
      return null;
    }
    const touched = { ...entry, lastAccess: Date.now() } as RegionEntry<T>;
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    store.put(touched);
    return touched;
  } catch (error) {
    console.error("airspaceCache read failed:", error);
    return null;
  }
}

/** Store a region response, evicting least-recently-used entries past the size cap. */
export async function putRegion<T>(
  key: string,
  kind: RegionKind,
  items: T[],
): Promise<void> {
  try {
    const db = await openDb();
    const now = Date.now();
    const entry: RegionEntry<T> = {
      key,
      kind,
      items,
      fetchedAt: now,
      lastAccess: now,
      sizeBytes: JSON.stringify(items).length,
    };
    await promisify(
      db.transaction(STORE, "readwrite").objectStore(STORE).put(entry),
    );
    await evictIfNeeded(db);
  } catch (error) {
    console.error("airspaceCache write failed:", error);
  }
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  const entries = (await promisify(
    db.transaction(STORE, "readonly").objectStore(STORE).getAll(),
  )) as RegionEntry[];

  let total = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (total <= SIZE_LIMIT_BYTES) {
    return;
  }

  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  for (const entry of entries.sort((a, b) => a.lastAccess - b.lastAccess)) {
    if (total <= SIZE_LIMIT_BYTES) {
      break;
    }
    store.delete(entry.key);
    total -= entry.sizeBytes;
  }
}

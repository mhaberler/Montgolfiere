/**
 * IndexedDB cache for raster map tile images.
 *
 * Tiles are cached lazily as they are requested by Leaflet's normal pan/zoom
 * tile loading — there is no bulk pre-download. Basemap tiles (OSM/topo/ortho)
 * never expire and are pruned only by LRU size eviction. Aeronautical overlay
 * tiles (OpenAIP/OpenFlightMaps) carry an AIRAC-cycle TTL: a stale tile is
 * still served immediately (avoids a flash of missing tile) while a
 * background refetch replaces it, mirroring resolveRegion()'s behavior in
 * useOpenAIP.ts.
 */

const DB_NAME = "airspace-cache";
const DB_VERSION = 2;
const TILE_STORE = "tiles";
const TILE_SIZE_LIMIT_BYTES = 200 * 1024 * 1024;

export const TILE_TTL_MS = 28 * 24 * 60 * 60 * 1000; // AIRAC cycle, aero layers only

export type TileLayerId = "osm" | "topo" | "ortho" | "ofm" | "openaip";

/** Layers whose tiles follow the AIRAC cycle and should be treated as stale past TILE_TTL_MS. */
const AERO_LAYERS: ReadonlySet<TileLayerId> = new Set(["ofm", "openaip"]);

export interface TileEntry {
  key: string; // `${layerId}:${z}/${x}/${y}`
  layerId: TileLayerId;
  blob: Blob;
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
        // Defensive/idempotent: airspaceCache.ts's onupgradeneeded is the
        // primary owner of schema creation for this DB; these guards make
        // it safe regardless of which module's open() call runs first.
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

/** Cache key for a tile: layer-scoped so different layers' z/x/y never collide. */
export function tileKey(
  layerId: TileLayerId,
  z: number,
  x: number,
  y: number,
): string {
  return `${layerId}:${z}/${x}/${y}`;
}

export function isAeroLayer(layerId: TileLayerId): boolean {
  return AERO_LAYERS.has(layerId);
}

/** Basemap tiles (OSM/topo/ortho) never go stale; only aero overlay tiles do. */
export function isTileStale(entry: TileEntry): boolean {
  return (
    isAeroLayer(entry.layerId) && Date.now() - entry.fetchedAt > TILE_TTL_MS
  );
}

/** Read a cached tile, refreshing its LRU stamp. Returns null when absent. */
export async function getTile(key: string): Promise<TileEntry | null> {
  try {
    const db = await openDb();
    const entry = (await promisify(
      db.transaction(TILE_STORE, "readonly").objectStore(TILE_STORE).get(key),
    )) as TileEntry | undefined;
    if (!entry) {
      return null;
    }
    const touched: TileEntry = { ...entry, lastAccess: Date.now() };
    db.transaction(TILE_STORE, "readwrite")
      .objectStore(TILE_STORE)
      .put(touched);
    return touched;
  } catch (error) {
    console.error("tileCache read failed:", error);
    return null;
  }
}

/** Store a fetched tile blob, evicting least-recently-used tiles past the size cap. */
export async function putTile(
  key: string,
  layerId: TileLayerId,
  blob: Blob,
): Promise<void> {
  try {
    const db = await openDb();
    const now = Date.now();
    const entry: TileEntry = {
      key,
      layerId,
      blob,
      fetchedAt: now,
      lastAccess: now,
      sizeBytes: blob.size,
    };
    await promisify(
      db
        .transaction(TILE_STORE, "readwrite")
        .objectStore(TILE_STORE)
        .put(entry),
    );
    await evictIfNeeded(db);
  } catch (error) {
    console.error("tileCache write failed:", error);
  }
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  const entries = (await promisify(
    db.transaction(TILE_STORE, "readonly").objectStore(TILE_STORE).getAll(),
  )) as TileEntry[];

  let total = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (total <= TILE_SIZE_LIMIT_BYTES) {
    return;
  }

  const store = db.transaction(TILE_STORE, "readwrite").objectStore(TILE_STORE);
  for (const entry of entries.sort((a, b) => a.lastAccess - b.lastAccess)) {
    if (total <= TILE_SIZE_LIMIT_BYTES) {
      break;
    }
    store.delete(entry.key);
    total -= entry.sizeBytes;
  }
}

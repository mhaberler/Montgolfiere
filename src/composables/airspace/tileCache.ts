/**
 * IndexedDB cache for raster map tile images.
 *
 * Tiles are cached lazily as they are requested by Leaflet's normal pan/zoom
 * tile loading — there is no bulk pre-download. Basemap tiles (OSM/topo/ortho)
 * never expire and are pruned only by LRU size eviction. Aeronautical overlay
 * tiles (OpenAIP/OpenFlightMaps) carry an AIRAC-cycle TTL: a stale tile is
 * still served immediately (avoids a flash of missing tile) while a
 * background refetch replaces it, mirroring how useCountryData.ts serves a
 * held country while revalidating it.
 */

import { openDb, promisify } from "./airspaceCache";

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
  const db = await openDb();
  try {
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
    // Quota exhaustion silently stops the cache growing; make it visible
    // rather than letting offline coverage quietly stall.
    if ((error as DOMException)?.name === "QuotaExceededError") {
      console.warn("tileCache full — evicting and retrying next write");
      await evictIfNeeded(db).catch(() => undefined);
      return;
    }
    console.error("tileCache write failed:", error);
  }
}

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
  const total = await totalBytes(db);
  if (total <= TILE_SIZE_LIMIT_BYTES) {
    return;
  }

  // Walk the lastAccess index oldest-first and delete until under budget.
  // Deliberately a cursor rather than getAll(): at a 200 MB cap the latter
  // materializes every tile blob in memory on every single write.
  let remaining = total;
  await new Promise<void>((resolve, reject) => {
    const store = db
      .transaction(TILE_STORE, "readwrite")
      .objectStore(TILE_STORE);
    const request = store.index("lastAccess").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || remaining <= TILE_SIZE_LIMIT_BYTES) {
        resolve();
        return;
      }
      remaining -= (cursor.value as TileEntry).sizeBytes;
      cursor.delete();
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

/** Sum of cached tile bytes, read via the key cursor to avoid loading blobs. */
async function totalBytes(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const request = db
      .transaction(TILE_STORE, "readonly")
      .objectStore(TILE_STORE)
      .openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(total);
        return;
      }
      total += (cursor.value as TileEntry).sizeBytes;
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

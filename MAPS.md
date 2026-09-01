# Airspace and Airport Caching

## Overview

Airspace and airport data from [OpenAIP](https://www.openaip.net) is cached in IndexedDB so the map works offline in flight. A region fetched once answers every position lookup inside it, online or not.

This replaced a per-position lookup scheme that issued one `dist=10` point query per 10 km of travel and kept nothing across app restarts. That scheme exhausted the API quota quickly and left the map blank without connectivity.

## Region Model

Lookups are answered from cached regions rather than per-point queries:

| Step | What happens                                               |
| ---- | ---------------------------------------------------------- |
| 1    | Position maps to a 0.25° grid cell                         |
| 2    | Cache is consulted for that cell                           |
| 3    | On miss, one `dist=50000` query fetches the whole region   |
| 4    | Response is stored in IndexedDB                            |
| 5    | Containing airspaces are found locally by point-in-polygon |

A 0.25° cell measures roughly 28 × 19 km at 47° latitude, so a 50 km fetch radius around the cell center covers it with margin. Cell size and the fetch radius are coupled — changing one requires re-checking the other.

`dist=50000` is OpenAIP's documented maximum for both endpoints; larger values return HTTP 400.

Measured region size at 47.125,15.125: 48 airspaces, ~112 KB. The 50 MB budget therefore holds roughly 450 regions.

## Cache Behavior

| Property | Value                                                        |
| -------- | ------------------------------------------------------------ |
| Store    | IndexedDB, database `airspace-cache`, object store `regions` |
| Key      | `airspace:47.00,15.25` / `airport:47.00,15.25`               |
| TTL      | 28 days (AIRAC cycle)                                        |
| Budget   | 50 MB, LRU eviction by `lastAccess`                          |

Resolution order:

1. Fresh cache entry wins outright.
2. Offline with any cached entry — serve it, however old.
3. Otherwise fetch; on failure fall back to the stale entry.

Data past its TTL is served with an age warning (`⚠ cached data 34 d old`) prefixed to the popup. Stale airspace beats no airspace in flight, but the age has to be visible.

All IndexedDB access fails soft: a blocked or unavailable store logs and returns empty rather than breaking the map.

## Populating the Cache

**Cache-as-you-fly** — every successful fetch is persisted, so any area flown while online is available later offline.

**Pre-flight download** — the ⤓ control on the map (top left, below the home button) fetches and stores both regions around the _map center_. Pan to tomorrow's launch site and tap it; a toast reports the airspace and airport counts.

The download bypasses the rate-limit cooldown, since an explicit user action should attempt both endpoints regardless of prior failures. A partial failure is reported as a failure — a "0 airspaces" success message would read as "this area has no airspaces".

## Rate Limiting

OpenAIP returns **HTTP 429 with no CORS headers** when the key is over quota. The browser therefore reports it as an opaque `TypeError: Failed to fetch` preceded by a CORS console error, and `response.status` is never readable — the `Response` object does not reach JS at all.

Consequence: a 429 cannot be distinguished from a genuine network failure in the browser. Any fetch failure while `navigator.onLine` is treated as a possible rate limit and arms a 60 s cooldown, which suppresses further requests instead of retrying on every position update.

A CORS error against `api.core.openaip.net` almost always means quota, not a misconfigured origin. Verify with curl, which sees the real status:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api.core.openaip.net/api/airspaces?pos=47.125,15.125&dist=50000&apiKey=$VITE_OPENAIP_KEY"
```

## Files

| Path                                        | Role                                                    |
| ------------------------------------------- | ------------------------------------------------------- |
| `src/composables/airspace/airspaceCache.ts` | IndexedDB store, grid keying, TTL, LRU eviction         |
| `src/composables/airspace/useOpenAIP.ts`    | Region fetch, cache-first resolution, `downloadRegion`  |
| `src/airspace/pointInPolygon.ts`            | Ray-casting containment test for Polygon / MultiPolygon |
| `src/components/airspace/AirspaceMap.vue`   | Download control                                        |

## Inspecting the Cache

DevTools → Application → IndexedDB → `airspace-cache` → `regions`, or from the console:

```js
indexedDB.open("airspace-cache").onsuccess = (e) => {
  e.target.result
    .transaction("regions", "readonly")
    .objectStore("regions")
    .getAll().onsuccess = (r) =>
    console.table(
      r.target.result.map(({ key, items, sizeBytes, fetchedAt }) => ({
        key,
        items: items.length,
        kb: Math.round(sizeBytes / 1024),
        ageDays: Math.floor((Date.now() - fetchedAt) / 86400000),
      })),
    );
};
```

To exercise the stale path, edit an entry's `fetchedAt` to more than 28 days ago and reload.

## Raster Tile Caching

Base map tiles (OpenStreetMap, OpenTopoMap, orthophoto) and the OpenFlightMaps/OpenAIP raster overlays are cached in IndexedDB the same way as region JSON, but as image blobs, one per `z/x/y` per layer, in a separate `tiles` object store of the same `airspace-cache` database.

**Cache-as-you-view only** — no bulk pre-download. A tile enters the cache the moment Leaflet requests it for the current view, exactly mirroring the existing network-only behavior, just persisted. This sidesteps the OSM tile usage policy's ban on bulk pre-fetching: nothing is ever fetched except what the user actually pans/zooms into.

| Property | Value                                                                        |
| -------- | ---------------------------------------------------------------------------- |
| Store    | IndexedDB, database `airspace-cache`, object store `tiles`                   |
| Key      | `` `${layerId}:${z}/${x}/${y}` `` — e.g. `osm:12/2145/1432`                  |
| TTL      | None for basemaps (osm/topo/ortho); 28 days for aero overlays (ofm/openaip)  |
| Budget   | 200 MB, LRU eviction by `lastAccess`, independent of the 50 MB region budget |

Keys are layer-scoped and coordinate-based rather than the raw tile URL, so OpenTopoMap's `{s}` subdomain rotation and OpenAIP's API-key query string don't fragment or fingerprint the cache.

Resolution order (`CachedTileLayer.createTile`):

1. Cache hit — display immediately via `URL.createObjectURL`.
2. Cache hit on an aero layer past its 28-day TTL — display the stale tile immediately, then fetch and overwrite the cache entry in the background (does not touch the on-screen tile; Leaflet naturally re-requests it on the next pan/zoom).
3. Cache miss — fetch, cache the blob, then display.
4. Fetch failure (offline or otherwise) — fall through to the browser's native broken-tile handling, same as an uncached `TileLayer` today.

Basemap tiles never expire because their imagery barely changes; only the 200 MB LRU eviction prunes them. Aero tiles carry a TTL because they follow the AIRAC cycle, same as the region cache.

Object URLs are revoked on the tile's `load`/`error` event, with a leak-guard sweep in `onRemove` (Leaflet's own layer-removal hook, fired on base-layer switch and on map teardown) for any tile whose URL never got its `load`/`error` fired.

### Files (tiles)

| Path                                          | Role                                                               |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `src/composables/airspace/tileCache.ts`       | IndexedDB tile blob store, TTL check, LRU eviction                 |
| `src/composables/airspace/CachedTileLayer.ts` | `TileLayer` subclass: cache-first `createTile`, blob URL lifecycle |
| `src/components/airspace/AirspaceMap.vue`     | Constructs each of the 5 layers as a `CachedTileLayer`             |

### Inspecting the tile cache

DevTools → Application → IndexedDB → `airspace-cache` → `tiles`, or from the console:

```js
indexedDB.open("airspace-cache").onsuccess = (e) => {
  e.target.result
    .transaction("tiles", "readonly")
    .objectStore("tiles")
    .getAll().onsuccess = (r) =>
    console.table(
      r.target.result.map(({ key, layerId, sizeBytes, fetchedAt }) => ({
        key,
        layerId,
        kb: Math.round(sizeBytes / 1024),
        ageDays: Math.floor((Date.now() - fetchedAt) / 86400000),
      })),
    );
};
```

To exercise the aero-layer stale path, edit an `ofm`/`openaip` entry's `fetchedAt` to more than 28 days ago and pan away and back.

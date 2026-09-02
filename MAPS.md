# Airspace and Airport Caching

## Overview

Airspace and airport data from [OpenAIP](https://www.openaip.net) is held in IndexedDB as **whole-country GeoJSON exports** so the map works offline in flight. One download covers a whole flight, needs no API key, and answers every position lookup inside that country.

This replaced a per-cell REST scheme that cached one 0.25° region (~28 × 19 km) around the map centre. A flight drifting out of that cell fell back to a rate-limited network call with no offline recourse, and the API key was required for every lookup.

## Country Model

| Step | What happens                                                      |
| ---- | ----------------------------------------------------------------- |
| 1    | Position or viewport maps to countries via a generated bbox table |
| 2    | Each covering country's stored layers are read from IndexedDB     |
| 3    | Containing airspaces are found locally by point-in-polygon        |
| 4    | Viewport airspace is drawn from the same store, bbox-culled       |

Exports come from a **stable, public, unauthenticated** bucket:

```
https://storage.openaip.net/openaip-system-exports/<cc>_<type>.geojson
```

`<type>` is `asp` (airspace), `apt` (airports), plus `nav`/`rpp`/`obs`/`hot`, which the app does not currently consume. The bucket is listable, sends `ETag` / `Last-Modified` / `cache-control: max-age=86400`, and supports range requests. It does **not** gzip — `content-encoding: utf-8` is bogus, so wire size equals raw size.

### Coverage is not uniform

Only **129 of 239 countries publish an airspace export**. 110 have airports but no `_asp.geojson` — Liechtenstein among them. The store therefore distinguishes three states, and they must never be conflated:

| State         | Meaning                                          |
| ------------- | ------------------------------------------------ |
| `ready`       | Downloaded and available                         |
| `missing`     | Published by openAIP, but not downloaded         |
| `unpublished` | openAIP publishes no such layer for this country |

Reporting "no airspaces at this position" when the covering country was never downloaded would claim clear air the app cannot see. Country bboxes also overlap heavily — a point in Liechtenstein falls inside the boxes of AT, CH and FR — so lookups union **every** covering country, and any covering country that is not downloaded makes the whole lookup a coverage failure.

### Sizes

| Set                 | Raw size |
| ------------------- | -------- |
| `at` (asp + apt)    | 0.9 MB   |
| `de` (asp + apt)    | 3.8 MB   |
| `fr` (asp + apt)    | 6.3 MB   |
| `us` (asp + apt)    | 72.7 MB  |
| World, asp + apt    | 173 MB   |
| World, all 6 layers | 436 MB   |

Obstacles alone are 252 MB of that 436 MB, which is why only `asp` and `apt` are fetched.

## Cache Behavior

| Property | Value                                                             |
| -------- | ----------------------------------------------------------------- |
| Store    | IndexedDB, database `airspace-cache` v3, object store `countries` |
| Key      | `de:asp` / `de:apt` — `country:layer`                             |
| Refresh  | ETag revalidation, throttled to 24 h, skipped on metered links    |
| Eviction | None — countries are removed only by explicit user delete         |

`airspaceCache.ts` is the **sole schema owner**. `tileCache.ts` shares its connection rather than opening its own; two independent `openDb()` implementations previously raced, and whichever won created only its own stores, leaving the database permanently missing the other's. The open path now verifies both stores exist and recreates the database if one is absent — a version bump alone cannot repair that, since the version is already current.

### Staleness

openAIP publishes on the AIRAC cycle. Rather than guessing from age, held countries are revalidated with a **HEAD request** comparing `ETag`:

- A matching ETag advances `lastCheckedAt` only — no re-download.
- A changed ETag triggers a full download.
- A failed HEAD falls through to a full download; it must never discard the held copy.

HEAD is used rather than a conditional GET because a `304` has an empty body, and the native HTTP plugin throws `JSONException` trying to parse it as JSON before the status is ever inspected.

Revalidation runs on app foreground **and on cold start** — `cameToForeground()` fires on an `isActive` transition, which never happens on a fresh launch, so a launched-and-never-backgrounded app would otherwise never refresh.

## Fetching: CORS and the native path

The export bucket sends **no CORS headers at all** (`OPTIONS` returns 403). Browser `fetch` cannot read it. Downloads therefore go through `@leadscout/http`, whose native implementation has no CORS to satisfy — the same pattern already used for METAR fetches in `src/process/qnh.ts`.

Two consequences worth remembering:

- **Native needs the absolute URL.** The Vite dev proxy (`/openaip-exports` → the bucket) exists only to give the _browser_ a same-origin path. Passing that relative path to the native plugin raises `MalformedURLException`, so the proxy is used only when `import.meta.env.DEV && !Capacitor.isNativePlatform()`.
- **The deployed web preview cannot download.** There is no proxy there; the feature is native-only in production.

## Populating the Cache

**Pre-flight download** — the ⤓ control on the map (top left) resolves every country whose bbox intersects the current viewport, shows a confirmation with the total size, and downloads on confirm. A wide viewport can span a dozen countries, so it never downloads without consent.

A partial failure is reported as a failure: a country holding airports but silently missing airspace would render as clear air.

**Managing downloads** — Settings → Airspace Data lists each downloaded country with size and age, offers per-country delete, shows total storage used, and reports whether eviction protection was granted.

### Storage persistence

`navigator.storage.persist()` is requested at startup and again when the Settings panel opens (opening it is itself engagement, which some browsers require). It is frequently **refused** — including on a real Android device — which is a downgrade, not a failure: caches still work, they are just evictable under storage pressure. On iOS this matters more, as WebKit clears non-persisted origins after ~7 days idle.

Quota exhaustion now throws rather than being logged and swallowed, so a half-written country cannot masquerade as an empty one.

## Rendering

The map draws **all airspace intersecting the viewport**, not only what encloses the current position — the CTR a balloon is about to drift into matters more than the one it is already inside. The altitude band (±2000 ft) **dims** airspace outside it rather than filtering it out.

The renderer is Leaflet's default **SVG**. `preferCanvas` was tried and reverted: Leaflet 2.0.0-alpha.1's canvas renderer does not reposition on pan, leaving airspace polygons frozen on screen while the map moves beneath them. Measured on-device over Paris with 12 countries downloaded, SVG holds 342–405 paths with a ~1.2 s settle after a pan, and Leaflet's own viewport culling keeps that flat as you zoom out — so no polygon cap is needed. If it ever becomes one, skipping the overlay below a zoom threshold is cheaper than a cap, and hides nothing at usable zooms.

## Files

| Path                                         | Role                                                          |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/composables/airspace/useCountryData.ts` | Country resolution, downloads, ETag revalidation, coverage    |
| `src/composables/airspace/airspaceCache.ts`  | IndexedDB schema owner, country store, persistence, quota     |
| `src/composables/airspace/useOpenAIP.ts`     | Point and viewport lookups, popup and stack feature building  |
| `src/airspace/pointInPolygon.ts`             | Ray-casting containment test for Polygon / MultiPolygon       |
| `src/components/airspace/AirspaceMap.vue`    | Viewport overlay, altitude dimming, download control          |
| `src/views/SettingsPage.vue`                 | Airspace Data accordion: list, delete, storage, refresh       |
| `src/assets/openaip-countries.json`          | Generated bbox + published-layer table (236 countries, 17 KB) |
| `localmaps/build-country-index.py`           | Regenerates the table by listing the export bucket            |

The bbox table is regenerated manually, not at build time. It stores antimeridian-crossing boxes as `minLng > maxLng`; a naive min/max makes `us` and `ru` span the globe and match every viewport on Earth.

## Inspecting the Cache

DevTools → Application → IndexedDB → `airspace-cache` → `countries`, or from the console:

```js
indexedDB.open("airspace-cache").onsuccess = (e) => {
  e.target.result
    .transaction("countries", "readonly")
    .objectStore("countries")
    .getAll().onsuccess = (r) =>
    console.table(
      r.target.result.map(({ key, items, sizeBytes, fetchedAt, etag }) => ({
        key,
        items: items.length,
        kb: Math.round(sizeBytes / 1024),
        ageDays: Math.floor((Date.now() - fetchedAt) / 86400000),
        etag: etag ? "y" : "n",
      })),
    );
};
```

To exercise revalidation, set an entry's `lastCheckedAt` more than 24 h in the past and foreground the app.

### Debugging on device

The WebView exposes a DevTools socket, which can be driven over CDP — the only way to reach the native HTTP path, which browser testing never exercises:

```bash
PID=$(adb shell pidof com.haberler.montgolfiere)
adb forward tcp:9333 localabstract:webview_devtools_remote_$PID
# then connect Playwright/DevTools to http://localhost:9333
```

Note that a live-reload build (`http://<host>:8100`) and a packaged build (`https://localhost`) are **different origins with separate IndexedDB**, so countries downloaded in one are invisible to the other. A live-reload origin is also non-secure, so `navigator.storage` is `undefined` there.

## Raster Tile Caching

Base map tiles (OpenStreetMap, OpenTopoMap, orthophoto) and the OpenFlightMaps/OpenAIP raster overlays are cached in IndexedDB as image blobs, one per `z/x/y` per layer, in the `tiles` object store of the same `airspace-cache` database.

**Cache-as-you-view only** — no bulk pre-download. A tile enters the cache the moment Leaflet requests it for the current view, exactly mirroring the existing network-only behavior, just persisted. This sidesteps the OSM tile usage policy's ban on bulk pre-fetching: nothing is ever fetched except what the user actually pans/zooms into.

| Property | Value                                                                       |
| -------- | --------------------------------------------------------------------------- |
| Store    | IndexedDB, database `airspace-cache`, object store `tiles`                  |
| Key      | `` `${layerId}:${z}/${x}/${y}` `` — e.g. `osm:12/2145/1432`                 |
| TTL      | None for basemaps (osm/topo/ortho); 28 days for aero overlays (ofm/openaip) |
| Budget   | 200 MB, LRU eviction by `lastAccess`                                        |

Keys are layer-scoped and coordinate-based rather than the raw tile URL, so OpenTopoMap's `{s}` subdomain rotation and OpenAIP's API-key query string don't fragment or fingerprint the cache. The OpenAIP **raster tile layer still uses `VITE_OPENAIP_KEY`** — dropping the REST API removed the key requirement for _data_, not for tiles.

Resolution order (`CachedTileLayer.createTile`):

1. Cache hit — display immediately via `URL.createObjectURL`.
2. Cache hit on an aero layer past its 28-day TTL — display the stale tile immediately, then fetch and overwrite the cache entry in the background (does not touch the on-screen tile; Leaflet naturally re-requests it on the next pan/zoom).
3. Cache miss — fetch, cache the blob, then display.
4. Fetch failure (offline or otherwise) — fall through to the browser's native broken-tile handling, same as an uncached `TileLayer` today.

Basemap tiles never expire because their imagery barely changes; only the 200 MB LRU eviction prunes them. Aero tiles carry a TTL because they follow the AIRAC cycle.

Eviction walks the `lastAccess` index with a cursor. It previously called `getAll()`, materializing every tile blob in memory on _every single write_ — at a 200 MB cap that is a serious spike.

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

## PMTiles (not used by the app)

`localmaps/openaip-s3-pmtiles.py` builds a vector-tile archive from the same exports. It is **not part of the app** — the per-country GeoJSON path replaced it — but is kept because the build is non-obvious:

- `--named-layer=name:file` per layer; the bare `--layer` flag is global, so repeating it leaves only the last layer in the archive.
- `--no-clipping` keeps whole polygons in every tile they touch. With clipping, an 8-vertex CTR came back as 169 fragments at z14, which turns "outline the airspace I am in" into a seam-aware reassembly problem. Duplicates are deduped on `_id` instead.
- Airspaces are capped at z12 while point layers go to z14. Duplication cost scales with feature area × 4^zoom: Austria's `CTA C` alone spans 25 025 tiles at z14, which turns a 7 MB archive into 72 MB.
- All feature-dropping and simplification is disabled — a missing airspace reads as "clear here", and a moved boundary moves a legal limit.

Attributes survive tiling as JSON strings (`hoursOfOperation`, `frequencies`, `runways`, the limit triples), so they need one `JSON.parse` each on read.

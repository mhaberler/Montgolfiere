# Mapterhorn Terrain Elevation Integration

## Overview

[Mapterhorn](https://mapterhorn.com) provides global terrain elevation data as PMTiles archives with Terrarium-encoded RGB elevation tiles (512px WebP).

This integration adds Mapterhorn as a DEM source for elevation lookups in the app, and includes a standalone Leaflet example for testing.

## Tile Routing

Mapterhorn splits tiles across multiple PMTiles files:

| Zoom Level | File | Coverage |
|---|---|---|
| z <= 12 | `planet.pmtiles` | Global |
| z > 12 | `6-{rx}-{ry}.pmtiles` | Regional (where `rx = x >> (z-6)`, `ry = y >> (z-6)`) |

Base URL: `https://download.mapterhorn.com`

Regional file availability varies by location. The lookup tries the highest zoom first and falls back to `planet.pmtiles` at z=12. A negative-lookup cache avoids repeated requests to unavailable regional files.

## Elevation Encoding

Mapterhorn uses **Terrarium** encoding (different from the Mapbox RGB encoding used by the other DEM sources):

```
Terrarium:  elevation = R * 256 + G + B / 256 - 32768
Mapbox RGB: elevation = -10000 + (R * 65536 + G * 256 + B) * 0.1
```

The encoding is auto-detected from PMTiles metadata. `MapterhornDEMLookup` forces Terrarium encoding regardless.

## Files

### App Integration

- **`src/dem/DEMLookup.ts`** — Base class. Added `ElevationEncoding` type (`'mapbox' | 'terrarium'`), `elevationEncoding` field on `DEMInfo`, auto-detection from metadata, and dual decoding in `extractElevationFromTile()`. Key methods made `protected` for subclassing.

- **`src/dem/MapterhornDEMLookup.ts`** — Extends `DEMLookup` with multi-file tile routing. Overrides `fetchTile()` to route to the correct PMTiles file based on zoom/coordinates. Overrides `getElevation()` to try highest zoom first (up to z=15) and fall back per-location. Caches PMTiles instances per regional file and tracks known max zoom per region.

- **`src/sensors/location.ts`** — Detects Mapterhorn URLs (`download.mapterhorn.com`) and instantiates `MapterhornDEMLookup` instead of `DEMLookup`.

- **`src/views/SettingsPage.vue`** — Added "Mapterhorn Global" as the first option in the DEM dropdown.

### Leaflet Example

- **`examples/leaflet-elevation/index.html`** — Standalone HTML file (no build step). Opens in any browser or static file server.

Features:
- Leaflet map with OSM base tiles
- Mousemove: displays lat, lon, elevation, zoom level, resolution (m/px), and source PMTiles file
- Click: popup with elevation and source
- Per-location zoom discovery with negative-lookup caching
- Throttled lookups (100ms) and LRU tile cache (100 tiles)

Usage:
```bash
cd examples/leaflet-elevation
python3 -m http.server 8765
# Open http://localhost:8765/index.html
```

## Verified Elevation Accuracy

| Location | Returned | Expected | Zoom | Source |
|---|---|---|---|---|
| Zurich | 408.4m | ~408m | 12 | planet.pmtiles |
| Innsbruck | 585.0m | ~574m | 15 | 6-34-22.pmtiles |
| Jungfrau | 4101.7m | ~4158m | 12 | planet.pmtiles |
| Basel (Rhine) | 253.1m | ~245m | 12 | planet.pmtiles |
| Switzerland | 1851.5m | — | 15 | 6-33-22.pmtiles |

## References

- [Mapterhorn PMTiles example](https://github.com/mapterhorn/mapterhorn/blob/main/website/examples/pmtiles/example.html)
- [Cesium Martini Vite PMTiles example](https://github.com/mhaberler/cesium-martini/tree/main/examples/vite-pmtiles)
- [Terrarium encoding](https://github.com/tilezen/joerd/blob/master/docs/formats.md#terrarium)

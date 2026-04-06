import { PMTiles } from "pmtiles";
import { DEMLookup, ElevationResult } from "./DEMLookup";

const MAX_ZOOM_TRY = 15;

/**
 * Mapterhorn multi-file PMTiles DEM lookup.
 *
 * Tile routing:
 *   z <= 12  → planet.pmtiles
 *   z > 12   → 6-{x>>(z-6)}-{y>>(z-6)}.pmtiles
 *
 * All tiles use Terrarium encoding (elevation = R*256 + G + B/256 - 32768).
 */
export class MapterhornDEMLookup extends DEMLookup {
  private baseUrl: string;
  private pmtilesCache: Map<string, PMTiles> = new Map();
  private planetMaxZoom: number = 12;
  // Cache known max zoom per regional file to avoid repeated 404s
  private regionalMaxZoomCache: Map<string, number> = new Map();

  constructor(
    baseUrl: string,
    options: {
      maxCacheSize?: number;
      debug?: boolean;
    } = {},
  ) {
    const planetUrl = `${baseUrl}/planet.pmtiles`;
    super(planetUrl, options);
    this.baseUrl = baseUrl;
  }

  protected override async initializeDEMInfo(): Promise<void> {
    await super.initializeDEMInfo();

    if (!this.demInfo) return;

    this.planetMaxZoom = this.demInfo.maxZoom;

    // Force terrarium encoding for Mapterhorn
    this.demInfo.elevationEncoding = "terrarium";

    // Set maxZoom to the highest we'll attempt — actual availability is per-location
    this.demInfo.maxZoom = MAX_ZOOM_TRY;
    this.demInfo.metersPerPixel = this.calculateMetersPerPixel(
      MAX_ZOOM_TRY,
      this.demInfo.tileSize,
    );

    if (this.debug) {
      console.log(
        `Mapterhorn DEM: planet maxZoom=${this.planetMaxZoom}, will try up to z=${MAX_ZOOM_TRY}`,
      );
    }
  }

  private getRegionalFileName(x: number, y: number, z: number): string {
    const rx = x >> (z - 6);
    const ry = y >> (z - 6);
    return `6-${rx}-${ry}`;
  }

  private getPMTilesForTile(x: number, y: number, z: number): PMTiles {
    if (z <= this.planetMaxZoom) {
      return this.pmtiles;
    }

    const name = this.getRegionalFileName(x, y, z);
    let instance = this.pmtilesCache.get(name);
    if (!instance) {
      const url = `${this.baseUrl}/${name}.pmtiles`;
      instance = new PMTiles(url);
      this.pmtilesCache.set(name, instance);

      if (this.debug) {
        console.log(
          `Created PMTiles instance for regional file: ${name}.pmtiles`,
        );
      }
    }
    return instance;
  }

  protected override async fetchTile(
    x: number,
    y: number,
    z: number,
  ): Promise<ArrayBuffer | null> {
    // Check negative cache for regional files
    if (z > this.planetMaxZoom) {
      const regionName = this.getRegionalFileName(x, y, z);
      const knownMax = this.regionalMaxZoomCache.get(regionName);
      if (knownMax !== undefined && z > knownMax) return null;
    }

    try {
      const pmtiles = this.getPMTilesForTile(x, y, z);
      const tileResult = await pmtiles.getZxy(z, x, y);
      return tileResult?.data || null;
    } catch (error) {
      if (this.debug) {
        console.error(`Failed to fetch Mapterhorn tile ${z}/${x}/${y}:`, error);
      }
      return null;
    }
  }

  override async getElevation(
    lat: number,
    lon: number,
  ): Promise<ElevationResult | null> {
    if (!this.demInfo) {
      await this.initializeDEMInfo();
    }

    const tileSize = this.demInfo!.tileSize;

    // Try highest zoom first, fall back to planet
    for (let zoom = MAX_ZOOM_TRY; zoom >= this.planetMaxZoom; zoom--) {
      const latRad = (lat * Math.PI) / 180;
      const n = Math.pow(2, zoom);
      const x = Math.floor(((lon + 180) / 360) * n);
      const y = Math.floor(
        ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n,
      );

      const tileData = await this.fetchTile(x, y, zoom);
      if (!tileData) {
        // Cache that this regional file doesn't have this zoom
        if (zoom > this.planetMaxZoom) {
          const regionName = this.getRegionalFileName(x, y, zoom);
          const prev = this.regionalMaxZoomCache.get(regionName);
          if (prev === undefined || zoom - 1 < prev) {
            this.regionalMaxZoomCache.set(regionName, zoom - 1);
          }
        }
        continue;
      }

      // Cache the tile
      const tileKey = `${zoom}/${x}/${y}`;
      this.addToCache(tileKey, tileData);

      // Extract pixel from tile
      const mapSize = tileSize * n;
      const pixelX = Math.floor(((lon + 180) / 360) * mapSize) % tileSize;
      const pixelY =
        Math.floor(
          ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * mapSize,
        ) % tileSize;

      try {
        const blob = new Blob([tileData]);
        const imageBitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(imageBitmap, 0, 0);

        const cx = Math.max(0, Math.min(pixelX, canvas.width - 1));
        const cy = Math.max(0, Math.min(pixelY, canvas.height - 1));
        const imageData = ctx.getImageData(cx, cy, 1, 1);
        const [r, g, b] = imageData.data;
        imageBitmap.close();

        // Terrarium encoding
        const elevation = r * 256 + g + b / 256 - 32768;

        return {
          elevation,
          metersPerPixel: this.calculateMetersPerPixel(zoom, tileSize),
          rgbValues: [r, g, b],
          tileCoords: [x, y, zoom],
        };
      } catch {
        continue;
      }
    }

    return null;
  }
}

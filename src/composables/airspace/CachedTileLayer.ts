import { TileLayer, type TileLayerOptions } from "leaflet";
import {
  getTile,
  isTileStale,
  putTile,
  tileKey,
  type TileLayerId,
} from "./tileCache";

interface TileCoords {
  x: number;
  y: number;
  z: number;
}

type DoneCallback = (error: Error | null, tile: HTMLElement) => void;

/**
 * TileLayer that caches fetched tile images in IndexedDB and serves them
 * on subsequent requests without a network round-trip. No preloading: a
 * tile only enters the cache the first time Leaflet actually requests it
 * for the current view (via createTile, called from GridLayer's own
 * viewport-driven tile scheduling) — exactly mirroring today's
 * network-only behavior, just persisted.
 */
export class CachedTileLayer extends TileLayer {
  private readonly layerId: TileLayerId;
  private readonly objectUrls = new Set<string>();

  constructor(layerId: TileLayerId, url: string, options?: TileLayerOptions) {
    super(url, options);
    this.layerId = layerId;
  }

  createTile(coords: TileCoords, done: DoneCallback): HTMLElement {
    const img = document.createElement("img");
    img.alt = "";
    if (this.options.crossOrigin || this.options.crossOrigin === "") {
      img.crossOrigin =
        this.options.crossOrigin === true ? "" : this.options.crossOrigin;
    }

    const key = tileKey(this.layerId, coords.z, coords.x, coords.y);
    const url = this.getTileUrl(coords);

    void this.loadTile(img, key, url, done);

    return img;
  }

  private async loadTile(
    img: HTMLImageElement,
    key: string,
    url: string,
    done: DoneCallback,
  ): Promise<void> {
    const cached = await getTile(key);

    if (cached) {
      this.showBlob(img, cached.blob, done);
      if (isTileStale(cached)) {
        // Aero layer past its 28-day AIRAC TTL: keep showing the stale
        // tile (already handed to showBlob above) but kick off a
        // background refetch-and-replace, mirroring resolveRegion()'s
        // stale-serve-then-refresh behavior in useOpenAIP.ts.
        void this.refetchAndCache(key, url);
      }
      return;
    }

    await this.fetchAndShow(img, key, url, done);
  }

  private async fetchAndShow(
    img: HTMLImageElement,
    key: string,
    url: string,
    done: DoneCallback,
  ): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      void putTile(key, this.layerId, blob);
      this.showBlob(img, blob, done);
    } catch (error) {
      // Offline + cache miss, or a genuine fetch failure: fall back to the
      // browser's native <img> error handling (broken-tile look), same as
      // today's plain TileLayer — do not throw.
      this.failTile(img, done, error);
    }
  }

  /**
   * Background refresh for a stale aero tile. Only writes the fresh blob
   * to the cache; does NOT touch the already-rendered <img> on screen —
   * Leaflet will request this tile again on its own (pan/zoom, or its
   * periodic redraw cycle), at which point loadTile() picks up the fresh,
   * now-non-stale cache entry. This avoids fighting Leaflet's own tile
   * positioning/lifecycle by mutating a tile element out from under it.
   */
  private async refetchAndCache(key: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return;
      }
      const blob = await response.blob();
      await putTile(key, this.layerId, blob);
    } catch {
      // Silent: the stale tile already on screen remains valid to show.
    }
  }

  private showBlob(
    img: HTMLImageElement,
    blob: Blob,
    done: DoneCallback,
  ): void {
    const objectUrl = URL.createObjectURL(blob);
    this.objectUrls.add(objectUrl);
    img.onload = () => {
      // Revoke as soon as the browser has decoded the bitmap into the
      // <img> — safe per MDN guidance, and prevents accumulating one
      // outstanding object URL per tile ever shown.
      this.revokeUrl(objectUrl);
      done(null, img);
    };
    img.onerror = (event) => {
      this.revokeUrl(objectUrl);
      this.failTile(img, done, event);
    };
    img.src = objectUrl;
  }

  private failTile(
    img: HTMLImageElement,
    done: DoneCallback,
    error: unknown,
  ): void {
    const errorUrl = this.options.errorTileUrl;
    if (errorUrl) {
      img.src = errorUrl;
    }
    done(error instanceof Error ? error : new Error(String(error)), img);
  }

  private revokeUrl(objectUrl: string): void {
    if (this.objectUrls.delete(objectUrl)) {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Revoke any object URLs still outstanding when the layer is removed
   * from the map (e.g. switching base layers, or unmounting AirspaceMap).
   * Covers tiles that were scrolled out of view before their load/error
   * event fired, which would otherwise leak their object URL.
   */
  onRemove(map: Parameters<TileLayer["onRemove"]>[0]): this {
    for (const objectUrl of this.objectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
    this.objectUrls.clear();
    return super.onRemove(map);
  }
}

declare module "leaflet" {
  export type ControlPosition =
    | "topleft"
    | "topright"
    | "bottomleft"
    | "bottomright";

  export type LatLngExpression = [number, number] | LatLng;

  export interface LeafletMouseEvent {
    latlng: LatLng;
    originalEvent?: MouseEvent;
  }

  export interface PathOptions {
    color?: string;
    weight?: number;
    fillColor?: string;
    fillOpacity?: number;
    dashArray?: string;
  }

  export class Layer {
    addTo(map: Map): this;
    remove(): this;
    bindPopup(content: string, options?: Record<string, unknown>): this;
    bindTooltip(content: string, options?: Record<string, unknown>): this;
    bringToFront(): this;
  }

  export class Path extends Layer {
    setStyle(options: PathOptions): this;
  }

  export class LatLng {
    lat: number;
    lng: number;
    constructor(lat: number, lng: number);
    toString(): string;
  }

  export class Marker extends Layer {
    constructor(latlng: LatLngExpression, options?: Record<string, unknown>);
    getLatLng(): LatLng;
    setLatLng(latlng: LatLngExpression): this;
    openPopup(): this;
  }

  export class CircleMarker extends Path {
    constructor(latlng: LatLngExpression, options?: Record<string, unknown>);
    setLatLng(latlng: LatLngExpression): this;
    setRadius(radius: number): this;
  }

  export class TileLayer extends Layer {
    constructor(url: string, options?: Record<string, unknown>);
  }

  export class GeoJSON extends Layer {
    constructor(data: unknown, options?: Record<string, unknown>);
    eachLayer(callback: (layer: Layer) => void): this;
  }

  export class Map {
    constructor(element: HTMLElement, options?: Record<string, unknown>);
    setView(
      center: LatLngExpression,
      zoom?: number,
      options?: Record<string, unknown>,
    ): this;
    getCenter(): LatLng;
    getZoom(): number;
    hasLayer(layer: Layer): boolean;
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    on(event: string, handler: (event: any) => void): this;
    distance(from: LatLngExpression, to: LatLngExpression): number;
    invalidateSize(options?: boolean | { debounceMoveend?: boolean }): this;
    remove(): void;
  }

  export class Control {
    constructor(options?: Record<string, unknown>);
    addTo(map: Map): this;
    static extend(options: Record<string, unknown>): new () => Control;
  }

  export namespace Control {
    class Layers extends Control {
      constructor(
        baseLayers: Record<string, Layer>,
        overlays?: Record<string, Layer>,
        options?: Record<string, unknown>,
      );
    }

    class Scale extends Control {
      constructor(options?: Record<string, unknown>);
    }
  }

  export namespace DomUtil {
    function create(
      tagName: string,
      className?: string,
      container?: HTMLElement,
    ): HTMLElement;
  }

  export namespace DomEvent {
    function disableClickPropagation(element: HTMLElement): void;
    function disableScrollPropagation(element: HTMLElement): void;
    function on(
      element: HTMLElement,
      type: string,
      handler: (event: Event) => void,
    ): void;
    function preventDefault(event: Event): void;
  }

  export class Icon {
    static Default: {
      mergeOptions(options: {
        iconRetinaUrl?: string;
        iconUrl?: string;
        shadowUrl?: string;
      }): void;
    };
  }

  const L: {
    Control: typeof Control;
    Map: typeof Map;
    TileLayer: typeof TileLayer;
    Marker: typeof Marker;
    CircleMarker: typeof CircleMarker;
    GeoJSON: typeof GeoJSON;
    LatLng: typeof LatLng;
    DomUtil: typeof DomUtil;
    DomEvent: typeof DomEvent;
    Icon: typeof Icon;
  };

  export default L;
}

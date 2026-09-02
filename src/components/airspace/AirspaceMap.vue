<template>
  <div class="airspace-map-root">
    <div ref="mapContainerRef" class="airspace-map-container"></div>
    <Teleport v-if="stackTarget" :to="stackTarget">
      <AirspaceStack
        :features="stackFeatures"
        :altitude="altitude"
        @update:altitude="onAltitudeEmit"
        @block-click="onStackBlockClick"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  CircleMarker,
  Control,
  DomEvent,
  DomUtil,
  GeoJSON as LeafletGeoJSON,
  Icon,
  LatLng,
  type LatLngExpression,
  Map as LeafletMap,
  Marker,
  type Layer,
  type LeafletMouseEvent,
  type Path,
  type PathOptions,
  TileLayer,
} from "leaflet";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Position } from "@capacitor/geolocation";
import L from "leaflet";
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { type AirspaceEntry, airspaceColor } from "@/airspace/airspaceStack";
import AirspaceStack from "@/components/airspace/AirspaceStack.vue";
import { CachedTileLayer } from "@/composables/airspace/CachedTileLayer";
import {
  airportPopupHtml,
  airportTypeName,
} from "@/composables/airspace/useOpenAIP";
import { useOpenAIP } from "@/composables/airspace/useOpenAIP";
import {
  countriesInBounds,
  downloadCountries,
  estimatedBytes,
  type Bounds,
} from "@/composables/airspace/useCountryData";
import { airportMinZoom, airspaceMinZoom } from "@/composables/useAppState";
import {
  location as sharedLocation,
  locationAvailable,
  locationError,
} from "@/sensors/location";

interface Props {
  mode: "track" | "what-if";
  altitude: number;
  follow: boolean;
  showAirspace: boolean;
  showStack: boolean;
  showAirports: boolean;
  home?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
  initialBaseLayer?: string;
  initialOverlays?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  home: true,
  initialCenter: () => [47, 15],
  initialZoom: 12,
  initialBaseLayer: "osm",
  initialOverlays: () => ["openaip"],
});

const emit = defineEmits<{
  "update:mode": [mode: "track" | "what-if"];
  "update:altitude": [altitude: number];
  "update:position": [pos: { lat: number; lng: number }];
  error: [message: string];
}>();

type AirspaceFeatureProps = {
  name?: string;
  type?: number;
  icaoClass?: number;
  lowerFt?: number;
  upperFt?: number;
  lowerLabel?: string;
  upperLabel?: string;
  activity?: number;
  flags?: string[];
  activeReason?: string;
  active?: boolean;
};

type FeatureLike = Feature<Geometry, AirspaceFeatureProps>;

type GeoJsonLayer = LeafletGeoJSON & { feature?: FeatureLike };
type LeafletMapWithExtras = LeafletMap & {
  getBounds(): { contains(latlng: LatLng): boolean };
  panTo(latlng: LatLngExpression): LeafletMap;
  fireEvent(type: string, event: unknown): LeafletMap;
};

type LeafletControlCtor = new () => Control;

type LeafletControlFactory = {
  layers: (
    baseLayers: Record<string, Layer>,
    overlays?: Record<string, Layer>,
  ) => Control;
  scale: (options?: Record<string, unknown>) => Control;
};

type LeafletRuntime = typeof L & {
  Circle: new (
    latlng: LatLngExpression,
    options?: Record<string, unknown>,
  ) => any;
  control?: LeafletControlFactory;
  Control: typeof Control & {
    Layers: new (
      baseLayers: Record<string, Layer>,
      overlays?: Record<string, Layer>,
      options?: Record<string, unknown>,
    ) => Control;
    Scale: new (options?: Record<string, unknown>) => Control;
  };
};

const leaflet = L as LeafletRuntime;
const iconDefault = Icon.Default as {
  imagePath?: string;
  prototype?: { _getIconUrl?: unknown };
  mergeOptions(options: {
    iconRetinaUrl?: string;
    iconUrl?: string;
    shadowUrl?: string;
  }): void;
};

const AIRSPACE_POPUP_OPTIONS = {
  className: "airspace-popup",
  minWidth: 420,
  maxWidth: 520,
} as const;

const AIRPORT_POPUP_OPTIONS = {
  className: "airport-popup",
  minWidth: 380,
  maxWidth: 520,
} as const;

const mapContainerRef = ref<HTMLDivElement | null>(null);
const stackTarget = ref<HTMLElement | null>(null);
const stackFeatures = shallowRef<Feature[]>([]);

const openAIP = useOpenAIP();

let map: LeafletMapWithExtras | null = null;
let currentMarker: Marker | null = null;
let currentGeojsonLayer: LeafletGeoJSON | null = null;
let lastGeojsonFeatures: FeatureCollection | null = null;
let highlightedLayer: Path | null = null;
const airportMarkerById = new Map<string, CircleMarker>();
let stackHostControl: Control | null = null;
let stackAttached = true;
let homeControl: Control | null = null;
let homeAttached = false;
let baseLayers: Record<string, TileLayer> = {};
let overlayLayers: Record<string, TileLayer> = {};

let trackMarker: CircleMarker | null = null;
let accuracyCircle: any = null;
let firstFix = true;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let downloadInFlight = false;

const AIRPORT_DEBUG =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get("debugAirports") === "1";

function logAirportRefresh(
  event: string,
  details: Record<string, unknown>,
): void {
  if (!AIRPORT_DEBUG) {
    return;
  }
  console.debug(`[airports] ${event}`, details);
}

const AIRPORT_ICON_COLOR: Record<number, string> = {
  3: "#1565C0",
  4: "#00838F",
  5: "#6A1B9A",
  7: "#00838F",
};

function airportColor(type: number): string {
  return AIRPORT_ICON_COLOR[type] ?? "#2E7D32";
}

/** Tray-and-arrow download glyph; a bare arrow character reads as navigation. */
function createDownloadIcon(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  for (const d of [
    "M12 3v11m0 0 4-4m-4 4-4-4",
    "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  ]) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

function createLatLng(
  latlng: LatLngExpression | { lat: number; lng: number },
): LatLng {
  if (latlng instanceof LatLng) {
    return latlng;
  }
  if (Array.isArray(latlng)) {
    return new LatLng(latlng[0], latlng[1]);
  }
  return new LatLng(latlng.lat, latlng.lng);
}

/** Feet either side of current altitude still treated as immediately relevant. */
const ALTITUDE_BAND_FT = 2000;

/**
 * Is this airspace near the current altitude?
 *
 * Used to dim, never to filter: the CTR 2000 ft above is exactly what a balloon
 * is about to drift into, so it must stay visible.
 */
function inAltitudeBand(properties: Record<string, any> | null | undefined) {
  const lower = properties?.lowerFt ?? 0;
  const upper = properties?.upperFt ?? 0;
  if (!upper) {
    return true;
  }
  return (
    props.altitude + ALTITUDE_BAND_FT >= lower &&
    props.altitude - ALTITUDE_BAND_FT <= upper
  );
}

function featureStyle(
  properties: Record<string, any> | null | undefined,
): PathOptions {
  const active = properties?.active ?? true;
  const relevant = inAltitudeBand(properties);
  const hex = airspaceColor({
    type: properties?.type ?? 0,
    icaoClass: properties?.icaoClass ?? 7,
    activity: properties?.activity ?? 0,
  });
  return {
    color: active ? hex : "#888888",
    weight: relevant ? 2 : 1,
    fillOpacity: relevant ? (active ? 0.2 : 0.08) : 0.03,
    dashArray: active ? undefined : "5, 5",
  };
}

function resetHighlight(): void {
  if (!highlightedLayer) {
    return;
  }
  const feature = (highlightedLayer as Path & { feature?: FeatureLike })
    .feature;
  highlightedLayer.setStyle(featureStyle(feature?.properties));
  highlightedLayer = null;
}

function highlightAirspaceOnMap(entry: AirspaceEntry): void {
  resetHighlight();
  if (!currentGeojsonLayer) {
    return;
  }

  currentGeojsonLayer.eachLayer((layer: Layer) => {
    const feature = (layer as GeoJsonLayer).feature;
    if (!feature?.properties) {
      return;
    }
    const props = feature.properties;
    if (
      props.name === entry.name &&
      props.lowerFt === entry.lowerFt &&
      props.upperFt === entry.upperFt
    ) {
      const path = layer as Path;
      path.setStyle({
        color: "#f1c40f",
        weight: 4,
        fillOpacity: 0.35,
      });
      path.bringToFront();
      highlightedLayer = path;
    }
  });
}

function onStackBlockClick(payload: {
  entry: AirspaceEntry;
  index: number;
}): void {
  highlightAirspaceOnMap(payload.entry);
}

function onAltitudeEmit(feet: number): void {
  emit("update:altitude", feet);
}

/** Leaflet 2 alpha types getBounds() more narrowly than the runtime object. */
function viewportBounds(target: LeafletMapWithExtras): Bounds {
  const bounds = target.getBounds() as unknown as {
    getSouth(): number;
    getNorth(): number;
    getWest(): number;
    getEast(): number;
  };
  return {
    minLat: bounds.getSouth(),
    maxLat: bounds.getNorth(),
    minLng: bounds.getWest(),
    maxLng: bounds.getEast(),
  };
}

/**
 * Draw all airspace intersecting the viewport.
 *
 * Separate from renderGeojson because the overlay and the altitude stack now
 * answer different questions: the overlay shows what is around, the stack shows
 * what encloses the current position.
 */
async function renderViewportAirspace(): Promise<void> {
  if (!map || !props.showAirspace) {
    return;
  }

  const zoom = map.getZoom();
  console.log(
    `map zoom: ${zoom} (airspace overlay min: ${airspaceMinZoom.value})`,
  );

  // Below the threshold individual airspace is unreadable and the polygon
  // count climbs steeply, so draw nothing rather than a useless tangle. The
  // altitude stack still answers "what is above me" — only the overlay stops.
  if (zoom < airspaceMinZoom.value) {
    renderGeojson(null, false);
    return;
  }

  const geojson = await openAIP.airspacesInBounds(viewportBounds(map));
  renderGeojson(geojson, false);
}

function renderGeojson(
  geojson: FeatureCollection | null,
  updateStack = true,
): void {
  resetHighlight();
  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;
  lastGeojsonFeatures = geojson;

  if (geojson && props.showAirspace && map) {
    // Non-interactive: the viewport overlay blankets the map, so interactive
    // polygons swallow every map click and what-if mode can never place a
    // marker. The marker's own popup already lists all airspace at the clicked
    // point, so the per-polygon popups only duplicated it.
    // Non-interactive, and no per-polygon popups: the viewport overlay
    // blankets the map, so clickable polygons swallow every map click and
    // what-if mode can never place a marker. bindPopup would re-enable
    // interactivity on its own (Leaflet needs a click target), so it has to go
    // too — the marker popup from fetchAirspaceAt already lists every airspace
    // at the clicked point, which is strictly more useful than one polygon's.
    currentGeojsonLayer = new LeafletGeoJSON(geojson, {
      interactive: false,
      style: (feature?: FeatureLike) => ({
        ...featureStyle(feature?.properties),
        interactive: false,
      }),
    }).addTo(map);
  }

  if (updateStack) {
    stackFeatures.value = props.showStack && geojson ? geojson.features : [];
  }

  for (const marker of airportMarkerById.values()) {
    marker.bringToFront();
  }
}

async function onMapClick(event: LeafletMouseEvent): Promise<void> {
  if (props.mode !== "what-if" || !map) {
    return;
  }

  const { lat, lng } = event.latlng;
  if (currentMarker) {
    currentMarker.setLatLng(event.latlng);
  } else {
    currentMarker = new Marker(event.latlng).addTo(map);
  }

  emit("update:position", { lat, lng });

  if (props.showAirspace || props.showStack) {
    const { popupText, geojson } = await openAIP.fetchAirspaceAt(lat, lng);
    if (props.showAirspace) {
      currentMarker.bindPopup(popupText, AIRSPACE_POPUP_OPTIONS).openPopup();
    } else {
      currentMarker.remove();
      currentMarker = new Marker(event.latlng).addTo(map);
    }
    renderGeojson(geojson);
  } else {
    renderGeojson(null);
  }
}

function clearAll(): void {
  currentMarker?.remove();
  currentMarker = null;
  resetHighlight();
  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;
  lastGeojsonFeatures = null;
  stackFeatures.value = [];
}

/**
 * Marker radius for a zoom level.
 *
 * CircleMarker radius is screen pixels, so without this a marker covers the
 * same 14 px at every zoom and airports converge into a blob as you zoom out.
 * Floored at 5 px: smaller than that and the marker stops being reliably
 * tappable in flight, which trades one problem for another.
 */
const AIRPORT_RADIUS_MAX = 7;
const AIRPORT_RADIUS_MIN = 5;
const AIRPORT_RADIUS_FULL_ZOOM = 12;

function airportRadius(zoom: number): number {
  const shrink = Math.max(0, AIRPORT_RADIUS_FULL_ZOOM - zoom);
  return Math.max(AIRPORT_RADIUS_MIN, AIRPORT_RADIUS_MAX - shrink);
}

/** Resize existing markers and honour the zoom threshold, without refetching. */
function applyAirportZoom(): void {
  if (!map) {
    return;
  }
  const zoom = map.getZoom();
  const visible = props.showAirports && zoom >= airportMinZoom.value;
  const radius = airportRadius(zoom);

  for (const marker of airportMarkerById.values()) {
    if (visible) {
      marker.setRadius(radius);
      if (!map.hasLayer(marker)) {
        marker.addTo(map);
      }
    } else if (map.hasLayer(marker)) {
      marker.remove();
    }
  }
}

async function refreshAirports(targetCenter?: LatLngExpression): Promise<void> {
  if (!props.showAirports || !map) {
    return;
  }

  const activeMap = map;
  const center = targetCenter ? createLatLng(targetCenter) : map.getCenter();
  logAirportRefresh("refresh-request", { center: center.toString() });

  await openAIP.refetchAirportsIfNeeded(center, (airports) => {
    let added = 0;
    let updated = 0;
    const radius = airportRadius(activeMap.getZoom());
    const seen = new Set<string>();

    for (const airport of airports) {
      seen.add(airport._id);
      const [lng, lat] = airport.geometry.coordinates;
      const color = airportColor(airport.type);
      const existing = airportMarkerById.get(airport._id);
      if (existing) {
        existing.setLatLng([lat, lng]);
        existing.setStyle({
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.55,
        });
        existing.setRadius(radius);
        existing.bindPopup(airportPopupHtml(airport), AIRPORT_POPUP_OPTIONS);
        existing.bindTooltip(
          `${airport.icaoCode ? `${airport.icaoCode} · ` : ""}${airport.name} (${airportTypeName(airport.type)})`,
          { sticky: true },
        );
        updated += 1;
        continue;
      }

      const marker = new CircleMarker([lat, lng], {
        radius,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.55,
      }).addTo(activeMap);
      marker.bindPopup(airportPopupHtml(airport), AIRPORT_POPUP_OPTIONS);
      marker.bindTooltip(
        `${airport.icaoCode ? `${airport.icaoCode} · ` : ""}${airport.name} (${airportTypeName(airport.type)})`,
        { sticky: true },
      );
      airportMarkerById.set(airport._id, marker);
      added += 1;
    }

    // Drop markers no longer in the fetched set. Without this the map only
    // ever accumulates airports from every region visited this session.
    let removed = 0;
    for (const [id, marker] of airportMarkerById) {
      if (!seen.has(id)) {
        marker.remove();
        airportMarkerById.delete(id);
        removed += 1;
      }
    }

    applyAirportZoom();

    for (const marker of airportMarkerById.values()) {
      marker.bringToFront();
    }

    logAirportRefresh("fetch-done", {
      removed,
      fetched: airports.length,
      added,
      updated,
      retained: airportMarkerById.size,
      center: center.toString(),
    });
  });
}

function scheduleRefreshAirports(): void {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshAirports();
  }, 500);
}

async function loadAirspaceAt(latlng: LatLng): Promise<void> {
  const { geojson } = await openAIP.fetchAirspaceAt(latlng.lat, latlng.lng);
  stackFeatures.value = props.showStack && geojson ? geojson.features : [];
  await renderViewportAirspace();
}

function syncTrackPosition(position: Position): void {
  if (!map) {
    return;
  }
  const activeMap = map;

  const latlng = new LatLng(
    position.coords.latitude,
    position.coords.longitude,
  );
  const accuracy = position.coords.accuracy;

  if (!trackMarker) {
    trackMarker = new CircleMarker(latlng, {
      radius: 8,
      color: "#ffffff",
      weight: 2,
      fillColor: "#1a73e8",
      fillOpacity: 1,
    }).addTo(activeMap);
    accuracyCircle = new leaflet.Circle(latlng, {
      radius: accuracy,
      color: "#1a73e8",
      weight: 1,
      fillColor: "#1a73e8",
      fillOpacity: 0.1,
    }).addTo(activeMap);
  } else {
    trackMarker.setLatLng(latlng);
    accuracyCircle?.setLatLng(latlng);
    accuracyCircle?.setRadius(accuracy);
  }

  if (firstFix) {
    activeMap.setView(latlng, activeMap.getZoom());
    firstFix = false;
  } else if (props.follow && !activeMap.getBounds().contains(latlng)) {
    activeMap.panTo(latlng);
  }

  emit("update:position", { lat: latlng.lat, lng: latlng.lng });

  if (position.coords.altitude != null && props.showStack) {
    emit("update:altitude", Math.round(position.coords.altitude * 3.28084));
  }

  if (
    (props.showAirspace || props.showStack) &&
    openAIP.needsAirspaceRefetch(latlng)
  ) {
    void loadAirspaceAt(latlng);
  }

  if (props.showAirports) {
    void refreshAirports(latlng);
  }
}

function startTracking(): void {
  firstFix = true;
  openAIP.resetAirspaceCenter();
  currentMarker?.remove();
  currentMarker = null;

  if (locationAvailable.value && sharedLocation.value) {
    syncTrackPosition(sharedLocation.value);
  }
}

function stopTracking(): void {
  trackMarker?.remove();
  trackMarker = null;
  accuracyCircle?.remove();
  accuracyCircle = null;
  openAIP.resetAirspaceCenter();
  firstFix = true;
}

function applyShowAirspace(): void {
  if (props.showAirspace) {
    if (lastGeojsonFeatures) {
      renderGeojson(lastGeojsonFeatures);
      return;
    }
    const anchor =
      props.mode === "track" && trackMarker
        ? (trackMarker as unknown as Marker).getLatLng()
        : currentMarker
          ? currentMarker.getLatLng()
          : null;
    if (anchor) {
      void loadAirspaceAt(anchor);
    }
    return;
  }

  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;
  resetHighlight();
}

function applyShowStack(): void {
  if (!stackHostControl || !map) {
    return;
  }

  if (props.showStack && !stackAttached) {
    stackHostControl.addTo(map);
    stackAttached = true;
    if (lastGeojsonFeatures) {
      stackFeatures.value = lastGeojsonFeatures.features;
      return;
    }
    const anchor =
      props.mode === "track" && trackMarker
        ? (trackMarker as unknown as Marker).getLatLng()
        : currentMarker
          ? currentMarker.getLatLng()
          : null;
    if (anchor) {
      void loadAirspaceAt(anchor);
    }
  } else if (!props.showStack && stackAttached) {
    stackAttached = false;
    (stackHostControl as Control & { remove(): void }).remove();
    stackFeatures.value = [];
  }
}

function applyShowAirports(): void {
  if (!map) {
    return;
  }

  if (props.showAirports) {
    // applyAirportZoom, not a bare addTo: re-showing airports must still
    // respect the zoom threshold.
    applyAirportZoom();
    openAIP.resetAirportCenter();
    const center =
      props.mode === "track" && trackMarker
        ? (trackMarker as unknown as Marker).getLatLng()
        : map.getCenter();
    void refreshAirports(center);
    return;
  }

  for (const marker of airportMarkerById.values()) {
    marker.remove();
  }
  openAIP.resetAirportCenter();
}

function applyHomeControl(): void {
  if (!map || !homeControl) {
    return;
  }

  const shouldShow = props.home && props.mode === "what-if";
  if (shouldShow && !homeAttached) {
    homeControl.addTo(map);
    homeAttached = true;
    return;
  }

  if (!shouldShow && homeAttached) {
    (homeControl as Control & { remove(): void }).remove();
    homeAttached = false;
  }
}

function shouldIgnoreMapClick(event: LeafletMouseEvent): boolean {
  const target = (event.originalEvent?.target as HTMLElement | null) ?? null;
  if (!target) {
    return false;
  }
  return Boolean(
    target.closest(
      ".leaflet-popup, .airspace-stack-control, .airspace-detail-popup",
    ),
  );
}

onMounted(() => {
  if (!mapContainerRef.value) {
    return;
  }

  if (iconDefault.prototype?._getIconUrl) {
    delete iconDefault.prototype._getIconUrl;
  }
  iconDefault.imagePath = "";
  iconDefault.mergeOptions({
    iconRetinaUrl: markerIcon2xUrl,
    iconUrl: markerIconUrl,
    shadowUrl: markerShadowUrl,
  });

  const openFlightMapsOverlay = {
    name: "OpenFlightMaps",
    url: "https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest",
    attribution:
      '(c) <a href="https://openflightmaps.org/" target="_blank" rel="noopener noreferrer">Open Flightmaps association</a>, (c) OpenStreetMap contributors, NASA elevation data',
    maxZoom: 16,
    opacity: 0.9,
    zIndex: 2,
  } as const;

  const mono = new CachedTileLayer(
    "osm",
    "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
    },
  );
  const topo = new CachedTileLayer(
    "topo",
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenTopoMap contributors",
      maxZoom: 17,
    },
  );
  const ortho = new CachedTileLayer(
    "ortho",
    "https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg",
    {
      attribution: "&copy; basemap.at",
      maxZoom: 18,
    },
  );
  const openFlightMapsLayer = new CachedTileLayer(
    "ofm",
    openFlightMapsOverlay.url,
    {
      attribution: openFlightMapsOverlay.attribution,
      maxZoom: openFlightMapsOverlay.maxZoom,
      opacity: openFlightMapsOverlay.opacity,
      zIndex: openFlightMapsOverlay.zIndex,
    },
  );
  const openAipLayer = new CachedTileLayer(
    "openaip",
    `https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(import.meta.env.VITE_OPENAIP_KEY as string)}`,
    {
      attribution:
        '&copy; <a href="https://www.openaip.net" target="_blank" rel="noopener noreferrer">openAIP</a>',
      maxZoom: 14,
      opacity: 0.8,
      zIndex: 4,
    },
  );

  baseLayers = { osm: mono, topo, ortho };
  overlayLayers = { ofm: openFlightMapsLayer, openaip: openAipLayer };

  const initialBase = baseLayers[props.initialBaseLayer] ?? mono;
  const initialOverlayLayers = (props.initialOverlays ?? [])
    .map((key) => overlayLayers[key])
    .filter((layer): layer is TileLayer => Boolean(layer));

  map = new LeafletMap(mapContainerRef.value, {
    center: props.initialCenter,
    zoom: props.initialZoom,
    zoomControl: true,
    layers: [initialBase, ...initialOverlayLayers],
  }) as LeafletMapWithExtras;

  new leaflet.Control.Layers(
    {
      OpenStreetMap: mono,
      OpenTopoMap: topo,
      "Austria Orthophoto": ortho,
    },
    {
      [openFlightMapsOverlay.name]: openFlightMapsLayer,
      openAIP: openAipLayer,
    },
  ).addTo(map);
  new leaflet.Control.Scale({ imperial: false, maxWidth: 300 }).addTo(map);

  const HomeControl = Control.extend({
    options: { position: "topleft" },
    onAdd(controlMap: LeafletMapWithExtras) {
      const btn = DomUtil.create(
        "div",
        "leaflet-bar home-control",
      ) as HTMLDivElement;
      const link = DomUtil.create("a", "", btn) as HTMLAnchorElement;
      link.href = "#";
      link.title = "Go to my location";
      link.innerHTML = "&#x2302;";
      link.role = "button";
      DomEvent.disableClickPropagation(btn);
      DomEvent.on(link, "click", (event: Event) => {
        DomEvent.preventDefault(event);
        if (!locationAvailable.value || !sharedLocation.value) {
          emit("error", locationError.value ?? "Location unavailable");
          return;
        }

        const latlng = new LatLng(
          sharedLocation.value.coords.latitude,
          sharedLocation.value.coords.longitude,
        );
        controlMap.setView(latlng, 12);
        controlMap.fireEvent("click", { latlng } as LeafletMouseEvent);
        if (sharedLocation.value.coords.altitude != null) {
          emit(
            "update:altitude",
            Math.round(sharedLocation.value.coords.altitude * 3.28084),
          );
        }
      });
      return btn;
    },
  }) as LeafletControlCtor;
  homeControl = new HomeControl();
  applyHomeControl();

  const DownloadControl = Control.extend({
    options: { position: "topleft" },
    onAdd(controlMap: LeafletMapWithExtras) {
      const btn = DomUtil.create(
        "div",
        "leaflet-bar download-control",
      ) as HTMLDivElement;
      const link = DomUtil.create("a", "", btn) as HTMLAnchorElement;
      link.href = "#";
      link.title = "Download countries in view for offline use";
      link.append(createDownloadIcon());
      link.role = "button";
      DomEvent.disableClickPropagation(btn);
      DomEvent.on(link, "click", (event: Event) => {
        DomEvent.preventDefault(event);
        if (downloadInFlight) {
          return;
        }

        void (async () => {
          const candidates = countriesInBounds(viewportBounds(controlMap));

          if (!candidates.length) {
            emit("error", "No openAIP coverage in view");
            return;
          }

          // Never download on a pinch-out without consent: a wide view can span
          // a dozen countries, and the US alone is 72 MB.
          const bytes = estimatedBytes(candidates, ["asp", "apt"]);
          const names = candidates.map((c) => c.toUpperCase()).join(", ");
          const megabytes = (bytes / 1e6).toFixed(1);
          if (
            !window.confirm(
              `Download airspace and airports for ${names}?\n\n${megabytes} MB`,
            )
          ) {
            return;
          }

          downloadInFlight = true;
          link.classList.add("is-busy");
          try {
            const { ok, failed } = await downloadCountries(candidates, [
              "asp",
              "apt",
            ]);
            if (failed.length) {
              emit(
                "error",
                `Downloaded ${ok.length}; failed: ${failed
                  .map((f) => f.country.toUpperCase())
                  .join(", ")}`,
              );
            } else {
              emit(
                "error",
                `Downloaded ${ok.length} countries (${megabytes} MB)`,
              );
            }
            await renderViewportAirspace();
            openAIP.resetAirportCenter();
            await refreshAirports();
          } catch (error: unknown) {
            emit("error", `Download failed: ${error}`);
          } finally {
            downloadInFlight = false;
            link.classList.remove("is-busy");
          }
        })();
      });
      return btn;
    },
  }) as LeafletControlCtor;
  new DownloadControl().addTo(map);

  const StackHostControl = Control.extend({
    options: { position: "bottomright" },
    onAdd() {
      const div = DomUtil.create(
        "div",
        "airspace-stack-host",
      ) as HTMLDivElement;
      DomEvent.disableClickPropagation(div);
      DomEvent.disableScrollPropagation(div);
      stackTarget.value = div;
      return div;
    },
    onRemove() {
      stackTarget.value = null;
    },
  }) as LeafletControlCtor;

  stackHostControl = new StackHostControl();
  stackHostControl.addTo(map);

  map.on("click", (event: LeafletMouseEvent) => {
    if (shouldIgnoreMapClick(event)) {
      return;
    }
    void onMapClick(event);
    logAirportRefresh("trigger-click", { center: event.latlng.toString() });
    void refreshAirports(event.latlng);
  });
  map.on("contextmenu", () => clearAll());
  // zoomend as well as moveend: on a zoom, moveend fires before the new zoom
  // level is applied, so the threshold check would read the previous value.
  map.on("zoomend", () => {
    void renderViewportAirspace();
    applyAirportZoom();
  });
  map.on("moveend", () => {
    if (!map) {
      return;
    }
    void renderViewportAirspace();
    scheduleRefreshAirports();
  });

  if (!props.showStack) {
    (stackHostControl as Control & { remove(): void }).remove();
    stackAttached = false;
  }

  if (props.mode === "track") {
    startTracking();
  }

  void refreshAirports();
});

onBeforeUnmount(() => {
  stopTracking();
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  map?.remove();
  map = null;
});

watch(
  () => props.mode,
  (newMode) => {
    if (newMode === "track") {
      startTracking();
    } else {
      stopTracking();
    }
    applyHomeControl();
  },
);
watch([locationAvailable, sharedLocation], ([available, position]) => {
  if (props.mode !== "track") {
    return;
  }

  if (!available || !position) {
    stopTracking();
    return;
  }

  syncTrackPosition(position);
});
watch(
  () => props.showAirspace,
  () => applyShowAirspace(),
);

// Changing the threshold in Settings must take effect without waiting for the
// next pan, which is otherwise the only thing that redraws the overlay.
watch(airspaceMinZoom, () => void renderViewportAirspace());
watch(airportMinZoom, () => applyAirportZoom());
watch(
  () => props.showStack,
  () => applyShowStack(),
);
watch(
  () => props.showAirports,
  () => applyShowAirports(),
);
</script>

<style scoped>
.airspace-map-root {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  align-self: stretch;
}

.airspace-map-container {
  position: absolute;
  inset: 0;
}
</style>

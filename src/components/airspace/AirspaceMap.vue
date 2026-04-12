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
import {
  type AirspaceEntry,
  activityName,
  airspaceColor,
  airspaceTypeName,
  icaoClassName,
} from "@/airspace/airspaceStack";
import AirspaceStack from "@/components/airspace/AirspaceStack.vue";
import {
  airportPopupHtml,
  airportTypeName,
} from "@/composables/airspace/useOpenAIP";
import { useOpenAIP } from "@/composables/airspace/useOpenAIP";
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
  circle: (latlng: LatLngExpression, options?: Record<string, unknown>) => any;
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

function featureStyle(
  properties: Record<string, any> | null | undefined,
): PathOptions {
  const active = properties?.active ?? true;
  const hex = airspaceColor({
    type: properties?.type ?? 0,
    icaoClass: properties?.icaoClass ?? 7,
    activity: properties?.activity ?? 0,
  });
  return {
    color: active ? hex : "#888888",
    weight: 2,
    fillOpacity: active ? 0.2 : 0.08,
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

function renderGeojson(geojson: FeatureCollection | null): void {
  resetHighlight();
  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;
  lastGeojsonFeatures = geojson;

  if (geojson && props.showAirspace && map) {
    currentGeojsonLayer = new LeafletGeoJSON(geojson, {
      style: (feature?: FeatureLike) => featureStyle(feature?.properties),
      onEachFeature: (feature: FeatureLike, layer: Layer) => {
        const name = feature.properties?.name ?? "Airspace";
        const lower = feature.properties?.lowerLabel ?? "?";
        const upper = feature.properties?.upperLabel ?? "?";
        const active = feature.properties?.active ?? true;
        const reason = feature.properties?.activeReason ?? "24h";
        const status = active
          ? `<span style="color:green">ACTIVE</span> (${reason})`
          : `<span style="color:grey">INACTIVE</span> (${reason})`;
        const cls = icaoClassName(feature.properties?.icaoClass ?? 7);
        const typ = airspaceTypeName(feature.properties?.type ?? 0);
        const act = feature.properties?.activity
          ? ` – ${activityName(feature.properties.activity)}`
          : "";
        const flags: string[] = feature.properties?.flags ?? [];
        const flagsHtml = flags.length ? `<br>${flags.join(", ")}` : "";
        layer.bindPopup(
          `<b>${name}</b> (${typ}, ${cls}${act})<br>${lower} – ${upper}<br>${status}${flagsHtml}`,
          AIRSPACE_POPUP_OPTIONS,
        );
      },
    }).addTo(map);
  }

  if (props.showStack) {
    stackFeatures.value = geojson ? geojson.features : [];
  } else {
    stackFeatures.value = [];
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

    for (const airport of airports) {
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
        existing.setRadius(7);
        existing.bindPopup(airportPopupHtml(airport), AIRPORT_POPUP_OPTIONS);
        existing.bindTooltip(
          `${airport.icaoCode ? `${airport.icaoCode} · ` : ""}${airport.name} (${airportTypeName(airport.type)})`,
          { sticky: true },
        );
        updated += 1;
        continue;
      }

      const marker = new CircleMarker([lat, lng], {
        radius: 7,
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

    for (const marker of airportMarkerById.values()) {
      marker.bringToFront();
    }

    logAirportRefresh("fetch-done", {
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
  renderGeojson(geojson);
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
    accuracyCircle = leaflet
      .circle(latlng, {
        radius: accuracy,
        color: "#1a73e8",
        weight: 1,
        fillColor: "#1a73e8",
        fillOpacity: 0.1,
      })
      .addTo(activeMap);
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
    for (const marker of airportMarkerById.values()) {
      marker.addTo(map);
    }
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

  const mono = new TileLayer("https://tile.openstreetmap.de/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  });
  const topo = new TileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenTopoMap contributors",
      maxZoom: 17,
    },
  );
  const ortho = new TileLayer(
    "https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg",
    {
      attribution: "&copy; basemap.at",
      maxZoom: 18,
    },
  );
  const openFlightMapsLayer = new TileLayer(openFlightMapsOverlay.url, {
    attribution: openFlightMapsOverlay.attribution,
    maxZoom: openFlightMapsOverlay.maxZoom,
    opacity: openFlightMapsOverlay.opacity,
    zIndex: openFlightMapsOverlay.zIndex,
  });
  const openAipLayer = new TileLayer(
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
  map.on("moveend", () => {
    if (!map) {
      return;
    }
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

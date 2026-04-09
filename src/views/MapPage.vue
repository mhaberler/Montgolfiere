<template>
  <div class="flex min-h-0 flex-1 flex-col bg-gray-50">
    <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppPageContent
        :padded="false"
        content-class="safe-bottom flex min-h-0 flex-1 flex-col"
      >
        <section ref="mapPageRef" class="map-page min-h-0 flex-1">
          <div
            ref="mapContainerRef"
            class="airspace-map h-full w-full"
            :style="{ height: mapHeight }"
          ></div>
        </section>
      </AppPageContent>
    </main>
  </div>
</template>

<script setup lang="ts">
import "leaflet/dist/leaflet.css";
import "@/assets/airspace-map.css";

import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import L, {
  Icon,
  type CircleMarker,
  type Control as LeafletControl,
  type ControlPosition,
  type GeoJSON as LeafletGeoJSON,
  type LatLng,
  type LatLngExpression,
  type Layer as LeafletLayer,
  type LeafletMouseEvent,
  type Map as LeafletMap,
  type Marker,
  type Path,
  type PathOptions,
  type TileLayer,
} from "leaflet";

import AppPageContent from "@/components/layout/AppPageContent.vue";
import {
  AIRPORT_FETCH_RADIUS_M,
  airportPopupHtml,
  airportTypeName,
  fetchAirports,
  getOpenAipTileUrl,
  lookupAirspaces,
} from "@/map/openaip";
import {
  AirspaceStackControl,
  activityName,
  airspaceColor,
  airspaceTypeName,
  icaoClassName,
  type AirspaceEntry,
} from "@/map/airspaceStack";
import { elevation, location } from "@/sensors/location";

type MapCenter = [number, number];
type OverlayKey = "ofm" | "openaip";
type BaseLayerKey = "osm" | "topo" | "ortho";
type FeatureLike = { properties?: Record<string, any> };
type PopupOpts = NonNullable<Parameters<Marker["bindPopup"]>[1]>;

const fallbackCenter: MapCenter = [47.1284, 15.211];
const airportRefetchThresholdM = AIRPORT_FETCH_RADIUS_M / 2;
const isNative = Capacitor.getPlatform() !== "web";

const openFlightMapsOverlay = {
  name: "OpenFlightMaps",
  url: "https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}.png?path=latest/aero/latest",
  attribution:
    '(c) <a href="https://openflightmaps.org/" target="_blank" rel="noopener noreferrer">Open Flightmaps association</a>, (c) OpenStreetMap contributors, NASA elevation data',
  maxZoom: 16,
  opacity: 0.9,
  zIndex: 2,
} as const;

const leafletIconDefault = Icon.Default as unknown as {
  imagePath?: string;
  prototype: { _getIconUrl?: unknown };
};
delete leafletIconDefault.prototype._getIconUrl;
leafletIconDefault.imagePath = "";

Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
});

const mapPageRef = ref<HTMLElement | null>(null);
const mapContainerRef = ref<HTMLDivElement | null>(null);
const mapHeight = ref("100dvh");

const hasLocation = computed(
  () =>
    location.value?.coords?.latitude != null &&
    location.value?.coords?.longitude != null,
);

const mapCenter = computed<MapCenter>(() => {
  if (!hasLocation.value || !location.value) {
    return fallbackCenter;
  }

  return [location.value.coords.latitude, location.value.coords.longitude];
});

let resizeObserver: ResizeObserver | null = null;
let map: LeafletMap | null = null;
let currentMarker: Marker | null = null;
let currentGeojsonLayer: LeafletGeoJSON | null = null;
let highlightedLayer: Path | null = null;
let stackControl: AirspaceStackControl | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastAirportFetchCenter: LatLng | null = null;
let airportRefreshInFlight = false;
let pendingAirportRefreshCenter: LatLng | null = null;

const airportMarkerById = new Map<string, CircleMarker>();

const baseLayerState: {
  active: BaseLayerKey;
  layers: Record<BaseLayerKey, TileLayer>;
} = {
  active: "osm",
  layers: {} as Record<BaseLayerKey, TileLayer>,
};

const overlayLayerState: {
  active: Set<OverlayKey>;
  layers: Record<OverlayKey, TileLayer>;
} = {
  active: new Set<OverlayKey>(["openaip"]),
  layers: {} as Record<OverlayKey, TileLayer>,
};

const airspacePopupOptions: PopupOpts = {
  className: "airspace-popup",
  minWidth: 280,
  maxWidth: 420,
};

const getSideControlPadding = (side: "left" | "right"): number => {
  const mapEl = mapContainerRef.value;
  if (!mapEl) {
    return 16;
  }

  const controls = Array.from(
    mapEl.querySelectorAll<HTMLElement>(`.leaflet-${side} .leaflet-control`),
  ).filter(
    (control) =>
      !control.classList.contains("leaflet-control-attribution") &&
      !control.classList.contains("leaflet-control-scale"),
  );
  if (controls.length === 0) {
    return 16;
  }

  const mapRect = mapEl.getBoundingClientRect();
  let occupied = 0;

  controls.forEach((control) => {
    const rect = control.getBoundingClientRect();
    const extent =
      side === "left" ? rect.right - mapRect.left : mapRect.right - rect.left;
    occupied = Math.max(occupied, extent);
  });

  return Math.max(16, Math.ceil(occupied) + 16);
};

const getPopupOptions = (overrides: PopupOpts = {}): PopupOpts => {
  const leftPaddingPx = getSideControlPadding("left");
  const rightPaddingPx = getSideControlPadding("right");

  return {
    autoPan: true,
    autoPanPaddingTopLeft: [leftPaddingPx, 16],
    autoPanPaddingBottomRight: [rightPaddingPx, 16],
    ...overrides,
  };
};

const syncMapHeight = () => {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const mapTop = mapPageRef.value?.getBoundingClientRect().top ?? 0;
  const nextHeight = Math.max(viewportHeight - mapTop, 0);

  mapHeight.value = `${nextHeight}px`;

  nextTick(() => {
    map?.invalidateSize(false);
  });
};

const airportColor = (type: number): string => {
  const colors: Record<number, string> = {
    3: "#1565C0",
    4: "#00838F",
    5: "#6A1B9A",
    7: "#00838F",
  };

  return colors[type] ?? "#2E7D32";
};

const featureStyle = (props: Record<string, any> | undefined): PathOptions => {
  const active = props?.active ?? true;
  const hex = airspaceColor({
    type: props?.type ?? 0,
    icaoClass: props?.icaoClass ?? 7,
    activity: props?.activity ?? 0,
  });

  return {
    color: active ? hex : "#888888",
    weight: 2,
    fillOpacity: active ? 0.2 : 0.08,
    dashArray: active ? undefined : "5, 5",
  };
};

const resetHighlight = () => {
  if (!highlightedLayer) {
    return;
  }

  const feature = (highlightedLayer as Path & { feature?: FeatureLike })
    .feature;
  highlightedLayer.setStyle(featureStyle(feature?.properties));
  highlightedLayer = null;
};

const highlightAirspaceOnMap = (entry: AirspaceEntry) => {
  resetHighlight();
  if (!currentGeojsonLayer) {
    return;
  }

  currentGeojsonLayer.eachLayer((layer: LeafletLayer) => {
    const feature = (layer as LeafletLayer & { feature?: FeatureLike }).feature;
    if (!feature?.properties) {
      return;
    }

    const props = feature.properties as Record<string, any>;
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
};

const clearAll = () => {
  currentMarker?.remove();
  currentMarker = null;
  resetHighlight();
  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;
  stackControl?.clear();
};

const shouldIgnoreMapClick = (event: LeafletMouseEvent): boolean => {
  const target = (event.originalEvent?.target as HTMLElement | null) ?? null;
  if (!target) {
    return false;
  }

  return Boolean(
    target.closest(
      ".leaflet-popup, .airspace-stack-control, .airspace-detail-popup, .leaflet-control",
    ),
  );
};

const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

const buildShareUrl = (): string => {
  if (!map) {
    return window.location.href;
  }

  const pos = currentMarker?.getLatLng() ?? map.getCenter();
  const params = new URLSearchParams();
  params.set("lat", pos.lat.toFixed(6));
  params.set("lng", pos.lng.toFixed(6));
  params.set("z", String(map.getZoom()));

  const altitudeFt = stackControl?.getValue() ?? 0;
  if (altitudeFt > 0) {
    params.set("alt", String(altitudeFt));
  }
  if (baseLayerState.active !== "osm") {
    params.set("base", baseLayerState.active);
  }
  if (overlayLayerState.active.size > 0) {
    params.set("overlays", Array.from(overlayLayerState.active).join(","));
  }

  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
};

const updateUrl = () => {
  const url = buildShareUrl();
  const queryIndex = url.indexOf("?");
  const nextUrl =
    queryIndex >= 0
      ? `${window.location.pathname}${url.slice(queryIndex)}`
      : window.location.pathname;
  history.replaceState(null, "", nextUrl);
};

const scheduleRefreshAirports = () => {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
  }

  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshAirports();
  }, 500);
};

const refreshAirports = async (targetCenter?: LatLngExpression) => {
  if (!map) {
    return;
  }

  const center =
    targetCenter instanceof L.LatLng
      ? targetCenter
      : Array.isArray(targetCenter)
        ? new L.LatLng(targetCenter[0], targetCenter[1])
        : map.getCenter();
  if (lastAirportFetchCenter) {
    const distance = map.distance(lastAirportFetchCenter, center);
    if (distance <= airportRefetchThresholdM) {
      return;
    }
  }

  if (airportRefreshInFlight) {
    pendingAirportRefreshCenter = center;
    return;
  }

  airportRefreshInFlight = true;
  try {
    const airports = await fetchAirports(center.lat, center.lng);
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
        existing.bindPopup(
          airportPopupHtml(airport),
          getPopupOptions(airspacePopupOptions),
        );
        existing.bindTooltip(
          `${airport.icaoCode ? `${airport.icaoCode} · ` : ""}${airport.name} (${airportTypeName(airport.type)})`,
          { sticky: true },
        );
        continue;
      }

      const marker = new L.CircleMarker([lat, lng], {
        radius: 7,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.55,
      });
      marker.bindPopup(
        airportPopupHtml(airport),
        getPopupOptions(airspacePopupOptions),
      );
      marker.bindTooltip(
        `${airport.icaoCode ? `${airport.icaoCode} · ` : ""}${airport.name} (${airportTypeName(airport.type)})`,
        { sticky: true },
      );
      marker.addTo(map);
      airportMarkerById.set(airport._id, marker);
    }

    for (const marker of airportMarkerById.values()) {
      marker.bringToFront();
    }

    lastAirportFetchCenter = center;
  } finally {
    airportRefreshInFlight = false;
    if (pendingAirportRefreshCenter) {
      const pendingCenter = pendingAirportRefreshCenter;
      pendingAirportRefreshCenter = null;
      void refreshAirports(pendingCenter);
    }
  }
};

const onMapClick = async (event: LeafletMouseEvent) => {
  if (!map) {
    return;
  }

  const { lat, lng } = event.latlng;
  if (currentMarker) {
    currentMarker.setLatLng(event.latlng);
  } else {
    currentMarker = new L.Marker(event.latlng).addTo(map);
  }

  const { popupText, geojson } = await lookupAirspaces(lat, lng);
  currentMarker
    .bindPopup(popupText, getPopupOptions(airspacePopupOptions))
    .openPopup();

  resetHighlight();
  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;

  if (geojson) {
    currentGeojsonLayer = new L.GeoJSON(geojson as unknown, {
      style: (feature: FeatureLike | undefined) =>
        featureStyle(feature?.properties),
      onEachFeature: (feature: FeatureLike, layer: LeafletLayer) => {
        const props = (feature.properties ?? {}) as Record<string, any>;
        const name = props.name ?? "Airspace";
        const lower = props.lowerLabel ?? "?";
        const upper = props.upperLabel ?? "?";
        const active = props.active ?? true;
        const reason = props.activeReason ?? "24h";
        const status = active
          ? `<span style="color:green">ACTIVE</span> (${reason})`
          : `<span style="color:grey">INACTIVE</span> (${reason})`;
        const cls = icaoClassName(props.icaoClass ?? 7);
        const type = airspaceTypeName(props.type ?? 0);
        const activity = props.activity
          ? ` – ${activityName(props.activity)}`
          : "";
        const flags = Array.isArray(props.flags) ? props.flags : [];
        const flagsHtml = flags.length ? `<br>${flags.join(", ")}` : "";
        layer.bindPopup(
          `<b>${name}</b> (${type}, ${cls}${activity})<br>${lower} – ${upper}<br>${status}${flagsHtml}`,
          getPopupOptions(airspacePopupOptions),
        );
      },
    }).addTo(map);

    stackControl?.update(geojson.features);
  } else {
    stackControl?.clear();
  }

  for (const marker of airportMarkerById.values()) {
    marker.bringToFront();
  }
};

const createHomeControl = (): LeafletControl =>
  new (L.Control.extend({
    options: { position: "topleft" as ControlPosition },
    onAdd(activeMap: LeafletMap) {
      const btn = L.DomUtil.create(
        "div",
        "leaflet-bar map-action-control",
      ) as HTMLDivElement;
      const anchor = L.DomUtil.create("a", "", btn) as HTMLAnchorElement;
      anchor.href = "#";
      anchor.title = "Go to current location";
      anchor.innerHTML = "&#x2302;";
      anchor.role = "button";
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(anchor, "click", (leafletEvent) => {
        L.DomEvent.preventDefault(leafletEvent);
        const coords = location.value?.coords;
        if (!coords) {
          return;
        }

        const latlng = new L.LatLng(coords.latitude, coords.longitude);
        activeMap.setView(latlng, Math.max(activeMap.getZoom(), 11));
        void onMapClick({ latlng } as LeafletMouseEvent);

        const altitudeM = coords.altitude ?? elevation.value ?? 0;
        if (altitudeM > 0) {
          stackControl?.setValue(Math.round(altitudeM * 3.28084));
        }
      });
      return btn;
    },
  }))();

const createShareControl = (): LeafletControl =>
  new (L.Control.extend({
    options: { position: "topleft" as ControlPosition },
    onAdd() {
      const btn = L.DomUtil.create(
        "div",
        "leaflet-bar map-action-control",
      ) as HTMLDivElement;
      const anchor = L.DomUtil.create("a", "", btn) as HTMLAnchorElement;
      anchor.href = "#";
      anchor.title = "Share this map state";
      anchor.innerHTML = "&#x1F517;";
      anchor.role = "button";
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(anchor, "click", async (leafletEvent) => {
        L.DomEvent.preventDefault(leafletEvent);
        const url = buildShareUrl();

        try {
          if (isNative) {
            await Share.share({
              title: "Montgolfiere map",
              text: "Map position and airspace lookup",
              url,
              dialogTitle: "Share map",
            });
          } else {
            const copied = await copyText(url);
            if (!copied) {
              return;
            }
          }

          btn.classList.add("copied");
          anchor.innerHTML = "&#x2713;";
          window.setTimeout(() => {
            btn.classList.remove("copied");
            anchor.innerHTML = "&#x1F517;";
          }, 2000);
        } catch (error) {
          console.warn("Share failed:", error);
        }
      });
      return btn;
    },
  }))();

const initializeMap = () => {
  if (!mapContainerRef.value || map) {
    return;
  }

  const osmLayer = new L.TileLayer(
    "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
    },
  );
  const topoLayer = new L.TileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenTopoMap contributors",
      maxZoom: 17,
    },
  );
  const orthoLayer = new L.TileLayer(
    "https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg",
    {
      attribution: "&copy; basemap.at",
      maxZoom: 18,
    },
  );
  const openFlightMapsLayer = new L.TileLayer(openFlightMapsOverlay.url, {
    attribution: openFlightMapsOverlay.attribution,
    maxZoom: openFlightMapsOverlay.maxZoom,
    opacity: openFlightMapsOverlay.opacity,
    zIndex: openFlightMapsOverlay.zIndex,
  });
  const openAipLayer = new L.TileLayer(getOpenAipTileUrl(), {
    attribution:
      '&copy; <a href="https://www.openaip.net" target="_blank" rel="noopener noreferrer">openAIP</a>',
    maxZoom: 14,
    opacity: 0.8,
    zIndex: 4,
  });

  baseLayerState.layers = {
    osm: osmLayer,
    topo: topoLayer,
    ortho: orthoLayer,
  };
  overlayLayerState.layers = {
    ofm: openFlightMapsLayer,
    openaip: openAipLayer,
  };

  map = new L.Map(mapContainerRef.value, {
    center: mapCenter.value,
    zoom: 12,
    zoomControl: true,
    layers: [osmLayer, openAipLayer],
  });

  new L.Control.Layers(
    {
      OpenStreetMap: osmLayer,
      OpenTopoMap: topoLayer,
      "Austria Orthophoto": orthoLayer,
    },
    {
      [openFlightMapsOverlay.name]: openFlightMapsLayer,
      openAIP: openAipLayer,
    },
    { collapsed: true },
  ).addTo(map);

  new L.Control.Scale({ imperial: false, maxWidth: 300 }).addTo(map);
  createHomeControl().addTo(map);
  createShareControl().addTo(map);

  stackControl = new AirspaceStackControl({
    onBlockClicked: (entry) => highlightAirspaceOnMap(entry),
    onAltChanged: () => updateUrl(),
  });
  stackControl.addTo(map);

  map.on("click", (event: LeafletMouseEvent) => {
    if (shouldIgnoreMapClick(event)) {
      return;
    }

    void onMapClick(event);
    void refreshAirports(event.latlng);
  });
  map.on("contextmenu", () => clearAll());
  map.on("moveend", () => {
    const activeMap = map;
    if (!activeMap) {
      return;
    }

    for (const [key, layer] of Object.entries(baseLayerState.layers) as [
      BaseLayerKey,
      TileLayer,
    ][]) {
      if (activeMap.hasLayer(layer)) {
        baseLayerState.active = key;
      }
    }

    overlayLayerState.active = new Set(
      (Object.entries(overlayLayerState.layers) as [OverlayKey, TileLayer][])
        .filter(([, layer]) => activeMap.hasLayer(layer))
        .map(([key]) => key),
    );

    updateUrl();
    scheduleRefreshAirports();
  });
  map.on("baselayerchange", () => updateUrl());
  map.on("overlayadd", () => updateUrl());
  map.on("overlayremove", () => updateUrl());

  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat") ?? "");
  const lng = parseFloat(params.get("lng") ?? "");
  const zoom = parseInt(params.get("z") ?? "12", 10);
  const altitude = parseInt(params.get("alt") ?? "", 10);
  const base = params.get("base") as BaseLayerKey | null;
  const overlays = params.get("overlays");

  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    const latlng = new L.LatLng(lat, lng);
    map.setView(latlng, zoom);
    void onMapClick({ latlng } as LeafletMouseEvent);
  }
  if (!Number.isNaN(altitude) && altitude > 0) {
    stackControl.setValue(altitude);
  }
  if (base && baseLayerState.layers[base]) {
    map.removeLayer(osmLayer);
    map.addLayer(baseLayerState.layers[base]);
    baseLayerState.active = base;
  }
  if (overlays) {
    for (const layer of Object.values(overlayLayerState.layers)) {
      map.removeLayer(layer);
    }
    overlayLayerState.active.clear();
    for (const key of overlays.split(",") as OverlayKey[]) {
      const layer = overlayLayerState.layers[key];
      if (!layer) {
        continue;
      }
      map.addLayer(layer);
      overlayLayerState.active.add(key);
    }
  }

  void refreshAirports(map.getCenter());
};

onMounted(async () => {
  await nextTick();
  syncMapHeight();
  initializeMap();

  if (typeof ResizeObserver !== "undefined" && mapPageRef.value) {
    resizeObserver = new ResizeObserver(syncMapHeight);
    resizeObserver.observe(mapPageRef.value);
  }

  window.addEventListener("resize", syncMapHeight);
  window.visualViewport?.addEventListener("resize", syncMapHeight);
});

watch(
  mapCenter,
  (center) => {
    if (!map || currentMarker) {
      return;
    }

    map.setView(center, map.getZoom(), { animate: false });
  },
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener("resize", syncMapHeight);
  window.visualViewport?.removeEventListener("resize", syncMapHeight);

  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  for (const marker of airportMarkerById.values()) {
    marker.remove();
  }
  airportMarkerById.clear();

  currentGeojsonLayer?.remove();
  currentGeojsonLayer = null;
  currentMarker?.remove();
  currentMarker = null;
  stackControl = null;

  map?.remove();
  map = null;
});
</script>

<style scoped>
.map-page {
  min-height: 20rem;
}

.airspace-map {
  min-height: 20rem;
}

.map-page :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}
</style>

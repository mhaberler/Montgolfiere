<template>
  <div class="app-root flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <TitleBar
      v-model:mode="state.mode"
      v-model:follow="state.follow"
      v-model:show-airspace="state.showAirspace"
      v-model:show-stack="state.showStack"
      v-model:show-airports="state.showAirports"
    />
    <div class="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <AirspaceMap
        class="min-h-0 flex-1"
        ref="mapRef"
        :mode="state.mode"
        :altitude="state.altitude"
        :follow="state.follow"
        :show-airspace="state.showAirspace"
        :show-stack="state.showStack"
        :show-airports="state.showAirports"
        :home="true"
        :link="true"
        :initial-center="initialCenter"
        :initial-zoom="initialZoom"
        :initial-base-layer="initialBaseLayer"
        :initial-overlays="initialOverlays"
        @update:mode="state.mode = $event"
        @update:altitude="state.altitude = $event"
        @update:viewport="onViewport"
        @update:position="onPosition"
        @update:base-layer="onBaseLayer"
        @update:overlays="onOverlays"
        @error="showToast"
      />
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import '@/assets/airspace-import.css'

import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import AirspaceMap from '@/components/airspace/AirspaceMap.vue'
import TitleBar from '@/components/airspace/TitleBar.vue'

const params = new URLSearchParams(location.search)
const initialLat = parseFloat(params.get('lat') ?? '')
const initialLng = parseFloat(params.get('lng') ?? '')
const initialCenter: [number, number] =
  !Number.isNaN(initialLat) && !Number.isNaN(initialLng)
    ? [initialLat, initialLng]
    : [47, 15]
const initialZoom = parseInt(params.get('z') ?? '12', 10)
const initialAlt = parseInt(params.get('alt') ?? '', 10)
const initialBaseLayer = params.get('base') ?? 'osm'
const initialOverlays = params.get('overlays')?.split(',').filter(Boolean) ?? ['openaip']

const urlMode = params.get('mode')
const urlFollow = params.get('follow')
const urlShow = params.get('show')

const state = reactive({
  mode: (urlMode === 'track' || urlMode === 'what-if' ? urlMode : 'what-if') as
    | 'track'
    | 'what-if',
  follow: urlFollow !== null ? urlFollow === '1' : true,
  showAirspace: true,
  showStack: true,
  showAirports: true,
  altitude: !Number.isNaN(initialAlt) && initialAlt > 0 ? initialAlt : 0,
})

if (urlShow !== null) {
  const keys = new Set(urlShow.split(',').filter(Boolean))
  state.showAirspace = keys.has('airspace')
  state.showStack = keys.has('stack')
  state.showAirports = keys.has('airports')
}

const viewport = reactive({
  lat: initialCenter[0],
  lng: initialCenter[1],
  zoom: initialZoom,
  baseLayer: initialBaseLayer,
  overlays: [...initialOverlays],
})

const mapRef = ref<InstanceType<typeof AirspaceMap> | null>(null)

const toastMsg = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string): void {
  toastMsg.value = message
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  toastTimer = setTimeout(() => {
    toastMsg.value = null
  }, 4000)
}

function updateUrl(): void {
  const nextParams = new URLSearchParams()
  nextParams.set('lat', viewport.lat.toFixed(6))
  nextParams.set('lng', viewport.lng.toFixed(6))
  nextParams.set('z', String(viewport.zoom))
  if (state.altitude > 0) {
    nextParams.set('alt', String(state.altitude))
  }
  if (viewport.baseLayer !== 'osm') {
    nextParams.set('base', viewport.baseLayer)
  }
  if (viewport.overlays.length) {
    nextParams.set('overlays', viewport.overlays.join(','))
  }
  if (state.mode !== 'what-if') {
    nextParams.set('mode', state.mode)
  }
  if (state.follow) {
    nextParams.set('follow', '1')
  }

  const show: string[] = []
  if (state.showAirspace) {
    show.push('airspace')
  }
  if (state.showStack) {
    show.push('stack')
  }
  if (state.showAirports) {
    show.push('airports')
  }
  if (show.length < 3) {
    nextParams.set('show', show.join(','))
  }

  history.replaceState(null, '', `${location.pathname}?${nextParams}`)
}

function onViewport(nextViewport: { lat: number; lng: number; zoom: number }): void {
  viewport.lat = nextViewport.lat
  viewport.lng = nextViewport.lng
  viewport.zoom = nextViewport.zoom
  updateUrl()
}

function onPosition(pos: { lat: number; lng: number }): void {
  viewport.lat = pos.lat
  viewport.lng = pos.lng
  updateUrl()
}

function onBaseLayer(key: string): void {
  viewport.baseLayer = key
  updateUrl()
}

function onOverlays(keys: string[]): void {
  viewport.overlays = keys
  updateUrl()
}

watch(state, () => updateUrl(), { deep: true })

onMounted(async () => {
  if (!Number.isNaN(initialLat) && !Number.isNaN(initialLng) && state.mode === 'what-if') {
    await nextTick()
    mapRef.value?.triggerClickAt({ lat: initialLat, lng: initialLng })
  }
})
</script>

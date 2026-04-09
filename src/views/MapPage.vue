<template>
  <div class="flex min-h-0 flex-1 flex-col bg-gray-50">
    <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppPageContent
        :padded="false"
        content-class="safe-bottom flex min-h-0 flex-1 flex-col"
      >
        <!-- <section
          class="border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-white/85"
        >
          <p class="text-sm font-semibold text-gray-900">{{ locationStatus }}</p>
          <p class="text-xs text-gray-500">{{ locationDetails }}</p>
        </section> -->

        <section ref="mapPageRef" class="map-page min-h-0 flex-1">
          <LMap
            ref="mapRef"
            v-model:zoom="zoom"
            :center="mapCenter"
            :height="mapHeight"
            width="100%"
            class="h-full w-full"
          >
            <LTileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              layer-type="base"
              name="OpenStreetMap"
            />
            <LMarker v-if="hasLocation" :lat-lng="mapCenter" />
          </LMap>
        </section>
      </AppPageContent>
    </main>
  </div>
</template>

<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from 'leaflet'
import { LMap, LMarker, LTileLayer } from '@maxel01/vue-leaflet'

import AppPageContent from '@/components/layout/AppPageContent.vue'
import { location } from '@/sensors/location'

type MapCenter = [number, number]
type LeafletMapHandle = {
  leafletObject?: {
    invalidateSize: (options?: boolean | { debounceMoveend?: boolean }) => void
  }
}

const fallbackCenter: MapCenter = [47.1284, 15.2110]

Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2xUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
})

const zoom = ref(13)
const mapRef = ref<LeafletMapHandle | null>(null)
const mapPageRef = ref<HTMLElement | null>(null)
const mapHeight = ref('100dvh')
let resizeObserver: ResizeObserver | null = null

const syncMapHeight = () => {
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const mapTop = mapPageRef.value?.getBoundingClientRect().top ?? 0
  const nextHeight = Math.max(viewportHeight - mapTop, 0)

  mapHeight.value = `${nextHeight}px`

  nextTick(() => {
    invalidateMapSize()
  })
}

const invalidateMapSize = () => {
  mapRef.value?.leafletObject?.invalidateSize(false)
}

onMounted(async () => {
  await nextTick()
  syncMapHeight()

  if (typeof ResizeObserver !== 'undefined' && mapPageRef.value) {
    resizeObserver = new ResizeObserver(syncMapHeight)
    resizeObserver.observe(mapPageRef.value)
  }

  window.addEventListener('resize', syncMapHeight)
  window.visualViewport?.addEventListener('resize', syncMapHeight)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', syncMapHeight)
  window.visualViewport?.removeEventListener('resize', syncMapHeight)
})

const hasLocation = computed(
  () =>
    location.value?.coords?.latitude != null &&
    location.value?.coords?.longitude != null,
)

const mapCenter = computed<MapCenter>(() => {
  if (!hasLocation.value || !location.value) {
    return fallbackCenter
  }

  return [location.value.coords.latitude, location.value.coords.longitude]
})
</script>

<style scoped>
.map-page {
  min-height: 20rem;
}

.map-page :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}
</style>
<template>
  <div class="app-root flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <TitleBar
      :mode="state.mode"
      v-model:follow="state.follow"
      v-model:show-airspace="state.showAirspace"
      v-model:show-stack="state.showStack"
      v-model:show-airports="state.showAirports"
      @update:mode="onModeChange"
    />
    <div class="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <AirspaceMap
        class="min-h-0 flex-1"
        :mode="state.mode"
        :altitude="state.altitude"
        :follow="state.follow"
        :show-airspace="state.showAirspace"
        :show-stack="state.showStack"
        :show-airports="state.showAirports"
        :home="true"
        @update:mode="onModeChange"
        @update:altitude="state.altitude = $event"
        @error="showToast"
      />
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "leaflet/dist/leaflet.css";
import "@/assets/airspace-import.css";

import { reactive, ref, watch } from "vue";
import AirspaceMap from "@/components/airspace/AirspaceMap.vue";
import TitleBar from "@/components/airspace/TitleBar.vue";
import { locationAvailable } from "@/sensors/location";

const modeLockedByUser = ref(false);

const state = reactive({
  mode: (locationAvailable.value ? "track" : "what-if") as "track" | "what-if",
  follow: true,
  showAirspace: true,
  showStack: true,
  showAirports: true,
  altitude: 0,
});

const toastMsg = ref<string | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string): void {
  toastMsg.value = message;
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    toastMsg.value = null;
  }, 4000);
}

function onModeChange(mode: "track" | "what-if"): void {
  modeLockedByUser.value = true;
  state.mode = mode;
}

watch(locationAvailable, (available) => {
  if (modeLockedByUser.value) {
    return;
  }
  state.mode = available ? "track" : "what-if";
});
</script>

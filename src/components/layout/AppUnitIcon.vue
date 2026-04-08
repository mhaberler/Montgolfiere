<template>
  <svg
    class="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(segment, index) in segments" :key="index" :d="segment" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

type IconName = "envelope" | "tank" | "oat" | "box" | "vario" | "switch";

const props = defineProps<{
  name: IconName;
}>();

const iconPaths: Record<IconName, string[]> = {
  envelope: ["M21 3 10 14", "M21 3 14 21 10 14 3 10 21 3Z"],
  tank: [
    "M12 3c-2.5 2.2-4 5.1-4 7.6A4 4 0 0 0 16 10.6C16 8.1 14.5 5.2 12 3Z",
    "M10 14h4",
    "M9 17h6",
    "M8 20h8",
  ],
  oat: ["M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z"],
  box: [
    "M3 7.5h14",
    "M17 10.5h4",
    "M3 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
  ],
  vario: ["M4 14h4l2-4 4 8 2-4h4"],
  switch: [
    "M8 12h8",
    "M12 8v8",
    "M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  ],
};

const segments = computed(() => iconPaths[props.name]);
</script>

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
import { computed } from 'vue'

const props = defineProps<{
  name: 'status' | 'sensors' | 'scan' | 'mqtt' | 'settings'
}>()

const iconPaths: Record<typeof props.name, string[]> = {
  status: ['M21 3 10 14', 'M21 3 14 21 10 14 3 10 21 3Z'],
  sensors: ['M9 9a3 3 0 1 1 6 0', 'M5.5 5.5a9 9 0 0 1 13 0', 'M2.5 2.5a13 13 0 0 1 19 0'],
  scan: ['M9 2h6', 'M10 6h4', 'M12 6v8', 'M9 14h6', 'M10 14v8', 'M14 14v8'],
  mqtt: ['M13 2 4 14h6l-1 8 9-12h-6l1-8Z'],
  settings: [
    'M12 3.75a1.25 1.25 0 0 1 1.25-1.25h.32a1.25 1.25 0 0 1 1.21.95l.22.87a1.25 1.25 0 0 0 1.79.79l.77-.41a1.25 1.25 0 0 1 1.5.24l.23.23a1.25 1.25 0 0 1 .24 1.5l-.41.77a1.25 1.25 0 0 0 .79 1.79l.87.22a1.25 1.25 0 0 1 .95 1.21v.32a1.25 1.25 0 0 1-.95 1.21l-.87.22a1.25 1.25 0 0 0-.79 1.79l.41.77a1.25 1.25 0 0 1-.24 1.5l-.23.23a1.25 1.25 0 0 1-1.5.24l-.77-.41a1.25 1.25 0 0 0-1.79.79l-.22.87a1.25 1.25 0 0 1-1.21.95h-.32a1.25 1.25 0 0 1-1.21-.95l-.22-.87a1.25 1.25 0 0 0-1.79-.79l-.77.41a1.25 1.25 0 0 1-1.5-.24l-.23-.23a1.25 1.25 0 0 1-.24-1.5l.41-.77a1.25 1.25 0 0 0-.79-1.79l-.87-.22A1.25 1.25 0 0 1 2.5 12v-.32a1.25 1.25 0 0 1 .95-1.21l.87-.22a1.25 1.25 0 0 0 .79-1.79L4.7 7.69a1.25 1.25 0 0 1 .24-1.5l.23-.23a1.25 1.25 0 0 1 1.5-.24l.77.41a1.25 1.25 0 0 0 1.79-.79l.22-.87a1.25 1.25 0 0 1 1.21-.95h.32A1.25 1.25 0 0 1 12 3.75Z',
    'M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z',
  ],
}

const segments = computed(() => iconPaths[props.name])
</script>
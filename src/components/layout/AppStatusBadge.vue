<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide"
    :class="badgeClass"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    color?: 'success' | 'warning' | 'danger' | 'medium' | 'primary'
  }>(),
  {
    color: 'medium',
  },
)

const badgeClass = computed(() => {
  switch (props.color) {
    case 'success':
      return 'bg-emerald-100 text-emerald-700'
    case 'warning':
      return 'bg-amber-100 text-amber-700'
    case 'danger':
      return 'bg-red-100 text-red-700'
    case 'primary':
      return 'bg-sky-100 text-sky-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
})
</script>
<template>
  <div :class="['app-page-content', padded && 'app-page-content--padded', contentClass]">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    contentClass?: string
    padded?: boolean
  }>(),
  {
    contentClass: '',
    padded: true,
  },
)
</script>
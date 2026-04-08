<template>
  <div class="app-page-toolbar">
    <div v-if="$slots.leading" class="app-page-toolbar__leading">
      <slot name="leading" />
    </div>
    <div class="app-page-toolbar__title">
      <slot />
    </div>
    <div v-if="$slots.trailing" class="app-page-toolbar__trailing">
      <slot name="trailing" />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-white">
    <main class="flex-1 overflow-auto">
      <AppPageContent content-class="safe-bottom" padded>
        <SensorAssignmentsPanel />
      </AppPageContent>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppPageContent from "@/components/layout/AppPageContent.vue";
import SensorAssignmentsPanel from "@/components/settings/SensorAssignmentsPanel.vue";
</script>

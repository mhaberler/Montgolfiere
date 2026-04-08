<template>
  <div class="flex min-h-screen flex-col bg-white">
    <nav
      id="tab-bar"
      class="safe-top sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85"
    >
      <div
        class="grid gap-2 px-3 py-2"
        :class="showDebugInfo ? 'grid-cols-5' : 'grid-cols-3'"
      >
        <button
          v-for="tab in visibleTabs"
          :key="tab.href"
          type="button"
          class="min-w-0 rounded-lg px-3 py-2 text-sm font-semibold leading-none transition-colors"
          :class="
            isActiveTab(tab.href)
              ? 'bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          "
          @click="navigateTo(tab.href)"
        >
          <span class="block truncate">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <router-view class="min-h-0 flex-1"></router-view>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showDebugInfo } from "@/composables/useAppState";

type TabItem = {
  href: string;
  label: string;
  debugOnly?: boolean;
};

const router = useRouter();
const route = useRoute();

const tabs: TabItem[] = [
  { href: "/tabs/tab1", label: "Status" },
  { href: "/tabs/tab2", label: "Sensors" },
  { href: "/tabs/mdns", label: "Scan", debugOnly: true },
  { href: "/tabs/mqtt", label: "MQTT", debugOnly: true },
  { href: "/tabs/settings", label: "Settings" },
];

const visibleTabs = computed(() =>
  tabs.filter((tab) => !tab.debugOnly || showDebugInfo.value),
);

const navigateTo = (href: string) => {
  if (route.path !== href) {
    router.push(href);
  }
};

const isActiveTab = (href: string) => route.path === href;
</script>

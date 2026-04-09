<template>
  <div class="flex min-h-screen flex-col bg-white">
    <nav
      id="tab-bar"
      class="safe-top sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85"
    >
      <div class="grid grid-cols-3 gap-2 px-3 py-2">
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

    <div class="flex min-h-0 flex-1 flex-col">
      <router-view class="min-h-0 flex-1"></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

type TabItem = {
  href: string;
  label: string;
};

const router = useRouter();
const route = useRoute();

const tabs: TabItem[] = [
  { href: "/tabs/tab1", label: "Status" },
  { href: "/tabs/map", label: "Map" },
  { href: "/tabs/settings", label: "Settings" },
];

const visibleTabs = tabs;

const navigateTo = (href: string) => {
  if (route.path !== href) {
    router.push(href);
  }
};

const isActiveTab = (href: string) => route.path === href;
</script>

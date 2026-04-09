<template>
  <div class="flex min-h-screen flex-col bg-white">
    <nav
      id="tab-bar"
      class="safe-top sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85"
    >
      <div
        class="grid grid-cols-3 gap-2 px-3 py-2"
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

    <div
      class="flex min-h-0 flex-1 flex-col"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
      @touchcancel.passive="resetSwipe"
    >
      <router-view class="min-h-0 flex-1"></router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
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

const SWIPE_MIN_DISTANCE = 72;
const SWIPE_MAX_OFF_AXIS = 56;

const touchStartX = ref<number | null>(null);
const touchStartY = ref<number | null>(null);

const navigateTo = (href: string) => {
  if (route.path !== href) {
    router.push(href);
  }
};

const isActiveTab = (href: string) => route.path === href;

const resetSwipe = () => {
  touchStartX.value = null;
  touchStartY.value = null;
};

const onTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1) {
    resetSwipe();
    return;
  }

  const target = event.target as HTMLElement | null;
  if (
    target?.closest(
      'input, textarea, select, button, a, summary, [role="button"]',
    )
  ) {
    resetSwipe();
    return;
  }

  touchStartX.value = event.touches[0].clientX;
  touchStartY.value = event.touches[0].clientY;
};

const onTouchEnd = (event: TouchEvent) => {
  if (
    touchStartX.value === null ||
    touchStartY.value === null ||
    event.changedTouches.length !== 1
  ) {
    resetSwipe();
    return;
  }

  const deltaX = event.changedTouches[0].clientX - touchStartX.value;
  const deltaY = event.changedTouches[0].clientY - touchStartY.value;

  if (
    Math.abs(deltaX) < SWIPE_MIN_DISTANCE ||
    Math.abs(deltaY) > SWIPE_MAX_OFF_AXIS
  ) {
    resetSwipe();
    return;
  }

  const currentIndex = visibleTabs.findIndex(
    (tab) => tab.href === route.path,
  );
  if (currentIndex === -1) {
    resetSwipe();
    return;
  }

  const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
  const nextTab = visibleTabs[nextIndex];

  if (nextTab) {
    navigateTo(nextTab.href);
  }

  resetSwipe();
};
</script>

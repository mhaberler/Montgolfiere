<template>
  <div class="flex min-h-screen flex-col bg-white">
    <ion-router-outlet class="flex-1"></ion-router-outlet>

    <nav
      id="tab-bar"
      class="safe-bottom border-t border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85"
    >
      <div class="grid gap-1 px-2 py-2" :class="showDebugInfo ? 'grid-cols-5' : 'grid-cols-3'">
        <button
          v-for="tab in visibleTabs"
          :key="tab.href"
          type="button"
          class="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors"
          :class="isActiveTab(tab.href) ? 'bg-sky-50 text-sky-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'"
          @click="navigateTo(tab.href)"
        >
          <AppTabIcon :name="tab.icon" />
          <span class="truncate">{{ tab.label }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonRouterOutlet } from '@ionic/vue'
import AppTabIcon from '@/components/layout/AppTabIcon.vue'
import { showDebugInfo } from "@/composables/useAppState";
// import { StatusBar, Style } from '@capacitor/status-bar';

type TabIconName = 'status' | 'sensors' | 'scan' | 'mqtt' | 'settings'

type TabItem = {
  href: string
  label: string
  icon: TabIconName
  debugOnly?: boolean
}

const router = useRouter()
const route = useRoute()

const tabs: TabItem[] = [
  { href: '/tabs/tab1', label: 'Status', icon: 'status' },
  { href: '/tabs/tab2', label: 'Sensors', icon: 'sensors' },
  { href: '/tabs/mdns', label: 'Scan', icon: 'scan', debugOnly: true },
  { href: '/tabs/mqtt', label: 'MQTT', icon: 'mqtt', debugOnly: true },
  { href: '/tabs/settings', label: 'Settings', icon: 'settings' },
]

const visibleTabs = computed(() =>
  tabs.filter((tab) => !tab.debugOnly || showDebugInfo.value),
)

const INACTIVITY_TIME = 5 * 1000; // seconds
let timeoutId: ReturnType<typeof setTimeout> | undefined;

const navigateTo = (href: string) => {
  if (route.path !== href) {
    router.push(href)
  }
}

const isActiveTab = (href: string) => route.path === href

const resetTimer = () => {
  clearTimeout(timeoutId);
  showTabs();
  timeoutId = setTimeout(hideTabs, INACTIVITY_TIME);
};

const hideTabs = () => {
  const tabBar = document.querySelector("#tab-bar") as HTMLElement;
  if (tabBar) tabBar.style.display = "none";
  // StatusBar.hide();
};

const showTabs = () => {
  const tabBar = document.querySelector("#tab-bar") as HTMLElement;
  if (tabBar) tabBar.style.display = "block";
  // StatusBar.show();
};

const setupActivityListeners = () => {
  ["click", "mousemove", "keypress", "scroll"].forEach((event) => {
    document.addEventListener(event, resetTimer);
  });
};

const removeActivityListeners = () => {
  ["click", "mousemove", "keypress", "scroll"].forEach((event) => {
    document.removeEventListener(event, resetTimer);
  });
};

onMounted(() => {
  resetTimer();
  setupActivityListeners();
});

onUnmounted(() => {
  clearTimeout(timeoutId);
  removeActivityListeners();
});
</script>

// src/composables/useAppLifecycle.ts
import { ref, type Ref } from 'vue'
import { App } from '@capacitor/app'

// --- Singleton state ---
const isActive = ref<boolean>(true)
let listenerRegistered = false

function registerListener() {
  if (listenerRegistered) return
  listenerRegistered = true

  App.addListener('appStateChange', (state) => {
    isActive.value = state.isActive
  })
}

/**
 * Singleton composable for app foreground/background state.
 * Uses @capacitor/app which handles native (iOS/Android) and web (Page Visibility API).
 */
export function useAppLifecycle() {
  registerListener()
  return {
    isActive: isActive as Ref<boolean>
  }
}

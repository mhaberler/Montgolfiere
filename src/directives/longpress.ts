import type { DirectiveBinding, ObjectDirective } from 'vue'

interface LongPressElement extends HTMLElement {
  _longPressTimer?: number | null
  _longPressHandlers?: {
    start: (e: Event) => void
    cancel: () => void
  }
}

type LongPressCallback = (event: Event) => void

interface LongPressBinding extends DirectiveBinding {
  value: LongPressCallback
  arg?: string // For delay customization
}

const longPressDirective: ObjectDirective<LongPressElement, LongPressCallback> = {
  mounted(el: LongPressElement, binding: LongPressBinding) {
    if (typeof binding.value !== 'function') {
      console.warn('`v-longpress` directive requires a function as its value')
      return
    }

    const delay: number = binding.arg ? parseInt(binding.arg, 10) : 500 // Customizable delay in ms
    
    if (isNaN(delay) || delay <= 0) {
      console.warn('`v-longpress` directive delay must be a positive number')
      return
    }

    const start = (e: Event): void => {
      // Only handle primary mouse button or touch events
      if (e.type === 'mousedown' && (e as MouseEvent).button !== 0) return
      
      if (el._longPressTimer === null || el._longPressTimer === undefined) {
        el._longPressTimer = window.setTimeout(() => {
          binding.value(e)
          el._longPressTimer = null
        }, delay)
      }
    }

    const cancel = (): void => {
      if (el._longPressTimer !== null && el._longPressTimer !== undefined) {
        clearTimeout(el._longPressTimer)
        el._longPressTimer = null
      }
    }

    // Store handlers on element for cleanup
    el._longPressHandlers = { start, cancel }

    // Add event listeners
    el.addEventListener('mousedown', start, { passive: true })
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('mouseup', cancel, { passive: true })
    el.addEventListener('mouseleave', cancel, { passive: true })
    el.addEventListener('touchend', cancel, { passive: true })
    el.addEventListener('touchcancel', cancel, { passive: true })
  },

  beforeUnmount(el: LongPressElement) {
    // Clean up timer
    if (el._longPressTimer !== null && el._longPressTimer !== undefined) {
      clearTimeout(el._longPressTimer)
      el._longPressTimer = null
    }

    // Remove event listeners
    if (el._longPressHandlers) {
      const { start, cancel } = el._longPressHandlers
      el.removeEventListener('mousedown', start)
      el.removeEventListener('touchstart', start)
      el.removeEventListener('mouseup', cancel)
      el.removeEventListener('mouseleave', cancel)
      el.removeEventListener('touchend', cancel)
      el.removeEventListener('touchcancel', cancel)
      
      // Clean up references
      delete el._longPressHandlers
    }
  },

  updated(el: LongPressElement, binding: LongPressBinding) {
    // If the binding value changes, we don't need to do anything
    // as the handler will use the new value automatically
    if (typeof binding.value !== 'function') {
      console.warn('`v-longpress` directive requires a function as its value')
    }
  }
}

export default longPressDirective

// Export type for usage in other files
export type { LongPressCallback }
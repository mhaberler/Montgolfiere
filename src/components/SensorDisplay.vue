<template>
  <div class="sensor-display">
    <div class="sensor-value">{{ formattedValue }}</div>
    <div class="sensor-bottom">
      <div class="sensor-name">{{ name }}</div>
      <div class="sensor-unit">{{ unit }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String, null, undefined],
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  decimals: {
    type: Number,
    default: 1
  },
  color: {
    type: String,
    default: '#333'
  }
})

const formattedValue = computed(() => {
  // if (props == null) {
  //   return "--";
  // }
  // if (!props.value) {
  //   return "--";
  // }
  if (typeof props.value === 'number') {
    return props.value.toFixed(props.decimals)
  }

  return props.value
})
</script>

<style scoped>
.sensor-display {
  border: 2px solid currentColor;
  padding: 0.75rem 1rem;
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  min-width: 8rem;
  /* width: 25%; */
  max-width: 12rem;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sensor-value {
  font-size: clamp(1.8rem, 4vw, 2rem);
  font-weight: 900;
  color: v-bind('color === "#333" ? "#000" : color');
  margin-bottom: 0.25rem;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}

.sensor-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.sensor-unit {
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  font-weight: 600;
  color: #333;
}

.sensor-name {
  font-size: clamp(0.625rem, 1.5vw, 0.75rem);
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  line-height: 1.2;
  font-weight: 700;
}

@media (max-width: 480px) {
  .sensor-display {
    min-width: 6rem;
    max-width: 10rem;
    padding: 0.5rem 0.75rem;
  }
}
</style>
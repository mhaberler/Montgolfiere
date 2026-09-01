<template>
  <div
    class="relative flex h-full w-full transform flex-col items-center justify-between border-4 bg-white p-1 text-center transition-all duration-300 ease-in-out select-none hover:scale-105 sm:p-5"
    :class="[frameClass, batteryBorderClass]"
    style="user-select: none; -webkit-user-select: none"
  >
    <!-- Value (Centered and Prominent) -->
    <div class="mt-0 mb-0 flex w-full grow items-center justify-center">
      <p
        v-if="isNumeric"
        class="ios:text-xl -ml-[0.3em] text-2xl leading-tight font-extrabold text-gray-800 tabular-nums sm:text-4xl"
      >
        <span class="inline-block w-[0.6em] text-right">{{ signChar }}</span
        >{{ absValue }}
      </p>
      <p
        v-else
        class="ios:text-xl text-2xl leading-tight font-extrabold text-gray-800 sm:text-4xl"
      >
        {{ displayValue }}
      </p>
    </div>

    <!-- Name and Unit (Bottom Row) -->
    <div class="mt-auto mb-0 w-full border-gray-200 pt-0 pb-0">
      <div class="grid w-full grid-cols-2 gap-2">
        <!-- Name (Lower Left) -->
        <div class="flex items-end justify-start">
          <p class="text-xs font-semibold text-gray-600 sm:text-sm">
            {{ name }}
          </p>
        </div>
        <div v-if="timeSinceUpdate === ''">
          <!-- Unit (Lower Right) -->
          <div class="flex items-end justify-end">
            <p class="text-xs font-semibold text-gray-600 sm:text-sm">
              {{ unit }}
            </p>
          </div>
        </div>
        <div v-else>
          <!-- Unit (Lower Right) -->
          <div class="flex items-end justify-end">
            <p class="text-xs font-semibold text-gray-600 sm:text-sm">
              {{ timeSinceUpdate }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

// Define the props for the component
const props = defineProps({
  value: {
    type: [String, Number, null],
    required: true,
    default: "N/A",
  },
  decimals: {
    type: [Number, null],
    default: 1,
  },
  name: {
    type: String,
    required: true,
    default: "Item",
  },
  unit: {
    type: String,
    required: true,
    default: "units",
  },
  tick: {
    type: Date,
    required: false,
    default: null,
  },
  ok: {
    type: Number,
    required: false,
    default: 5,
  },
  warning: {
    type: Number,
    required: false,
    default: 10,
  },
  timedOut: {
    type: Number,
    required: false,
    default: 20,
  },
  frameClass: {
    type: String,
    required: false,
    default: "",
  },
  forceCentered: {
    type: Boolean,
    default: false,
  },
  batteryStatus: {
    type: [Number, null], // Can be a number (0-100) or null if not applicable
    default: null, // Default to null, so the bar is not shown by default
    validator: (value) => value === null || (value >= 0 && value <= 100),
  },
});

const lastUpdated = ref(new Date());

watch(
  () => props.value,
  () => {
    lastUpdated.value = new Date();
  },
);

const isNumeric = computed(() => {
  return (
    !props.forceCentered &&
    typeof props.value === "number" &&
    typeof props.decimals === "number"
  );
});

const signChar = computed(() => {
  if (isNumeric.value) {
    return props.value < 0 ? "\u2212" : "";
  }
  return "";
});

const absValue = computed(() => {
  if (isNumeric.value) {
    return Math.abs(props.value).toFixed(props.decimals);
  }
  return "";
});

const displayValue = computed(() => {
  if (props == null || !props.value) {
    return "--";
  }
  return props.value;
});

const timeSinceUpdate = computed(() => {
  if (!props.tick) return "";
  const diff = Math.max(
    Math.floor((props.tick.getTime() - lastUpdated.value.getTime()) / 1000),
    0,
  );
  return `${diff} second${diff === 1 ? "" : "s"}`;
});

const statusColor = computed(() => {
  if (!props.tick) return "green";
  const diff = Math.floor(
    (props.tick.getTime() - lastUpdated.value.getTime()) / 1000,
  );
  if (diff < props.ok) return "green";
  if (diff < props.warning) return "yellow";
  if (diff < props.timedOut) return "orange";
  return "red";
});

// Computed property for battery border color
const batteryBorderClass = computed(() => {
  if (props.batteryStatus === null) {
    return "border-gray-300"; // Default border color if no battery status
  } else if (props.batteryStatus > 60) {
    return "border-green-500";
  } else if (props.batteryStatus > 20) {
    return "border-yellow-500";
  } else {
    return "border-red-500";
  }
});
</script>

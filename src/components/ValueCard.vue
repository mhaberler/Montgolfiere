<template>
    <div class="relative w-full h-full bg-white   p-1 sm:p-5 flex flex-col justify-between items-center text-center transition-all duration-300 ease-in-out transform hover:scale-105 border-4"
        :class="[frameClass, batteryBorderClass]">
        <!-- Value (Centered and Prominent) -->
        <div class="flex-grow flex items-center justify-center w-full mb-0 mt-0">
            <p class="text-2xl sm:text-4xl font-extrabold text-gray-800 leading-tight">
                {{ formattedValue }}
            </p>
        </div>

        <!-- Name and Unit (Bottom Row) -->
        <div class="w-full mt-auto mb-0 pb-0 pt-0  border-gray-200">
            <div class="grid grid-cols-2 w-full gap-2">
                <!-- Name (Lower Left) -->
                <div class="flex justify-start items-end">
                    <p class="text-xs sm:text-sm font-semibold text-gray-600">
                        {{ name }}
                    </p>
                </div>
                <div v-if="timeSinceUpdate === ''">
                    <!-- Unit (Lower Right) -->
                    <div class="flex justify-end items-end">
                        <p class="text-xs sm:text-sm font-semibold text-gray-600">
                            {{ unit }}
                        </p>
                    </div>
                </div>
                <div v-else>
                    <!-- Unit (Lower Right) -->
                    <div class="flex justify-end items-end">
                        <p class="text-xs sm:text-sm font-semibold text-gray-600">
                            {{ timeSinceUpdate }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Define the props for the component
const props = defineProps({
    value: {
        type: [String, Number, null],
        required: true,
        default: 'N/A'
    },
    decimals: {
        type: [Number, null],
        default: 1
    },
    name: {
        type: String,
        required: true,
        default: 'Item'
    },
    unit: {
        type: String,
        required: true,
        default: 'units'
    },
    tick: {
        type: Date,
        required: false,
        default: null
    },
    ok: {
        type: Number,
        required: false,
        default: 5
    },
    warning: {
        type: Number,
        required: false,
        default: 10
    },
    timedOut: {
        type: Number,
        required: false,
        default: 20
    },
    frameClass: {
        type: String,
        required: false,
        default: ''
    },
    batteryStatus: {
        type: [Number, null], // Can be a number (0-100) or null if not applicable
        default: null, // Default to null, so the bar is not shown by default
        validator: value => (value === null || (value >= 0 && value <= 100))
    }
});

const lastUpdated = ref(new Date())


watch(() => props.value, () => {
    lastUpdated.value = new Date()
})

const formattedValue = computed(() => {
    if (props == null) {
      return "--";
    }
    if (!props.value) {
      return "--";
    }
    if (typeof props.value === 'number' && typeof props.decimals === 'number') {
        return props.value.toFixed(props.decimals)
    }
    return props.value
})


const timeSinceUpdate = computed(() => {
    if (!props.tick) return ''
    const diff = Math.max(Math.floor((props.tick.getTime() - lastUpdated.value.getTime()) / 1000),0)
    return `${diff} second${diff === 1 ? '' : 's'}`
})

const statusColor = computed(() => {
    if (!props.tick) return 'green'
    const diff = Math.floor((props.tick.getTime() - lastUpdated.value.getTime()) / 1000)
    if (diff < ok) return 'green'
    if (diff < warning) return 'yellow'
    if (diff < timedOut) return 'orange'
    return 'red'
})

// Computed property for battery border color
const batteryBorderClass = computed(() => {
    if (props.batteryStatus === null) {
        return 'border-gray-300'; // Default border color if no battery status
    } else if (props.batteryStatus > 60) {
        return 'border-green-500';
    } else if (props.batteryStatus > 20) {
        return 'border-yellow-500';
    } else {
        return 'border-red-500';
    }
});
</script>

<style scoped>
/* No custom CSS needed as Tailwind handles all styling */
</style>

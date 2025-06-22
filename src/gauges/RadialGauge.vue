<template>
  <canvas class="canvas-gauges"></canvas>
</template>

<script>
import { RadialGauge } from 'canvas-gauges'

const DEFAULT_OPTIONS = {
  width: 200,
  height: 200,
  minValue: 0,
  maxValue: 500,
  value: 0,
  units: '',
  majorTicks: ['0','100','200','300','400','500'],
  minorTicks: 2,
  strokeTicks: true,
  highlights: [],
  colorPlate: "#fff",
  colorMajorTicks: "#444",
  colorMinorTicks: "#666",
  colorTitle: "#888",
  colorUnits: "#888",
  colorNumbers: "#444",
  colorNeedle: "rgba(240, 128, 128, 1)",
  colorNeedleEnd: "rgba(255, 160, 122, .9)",
  valueBox: true,
  animationRule: "bounce",
  animationDuration: 500
};

export default {
  props: {
    value: Number,
    options: {
      type: Object,
      default: () => ({})
    }
  },

  data () {
    return {
      chart: null
    }
  },

  mounted () {
    // Merge default options, user options, and required properties
    const opts = {
      ...DEFAULT_OPTIONS,
      ...this.options,
      renderTo: this.$el,
      value: this.value !== undefined ? this.value : (this.options.value ?? DEFAULT_OPTIONS.value)
    };
    try {
      this.chart = new RadialGauge(opts).draw();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('RadialGauge error:', e, opts);
    }
  },

  beforeUnmount() {
    if (this.chart && typeof this.chart.destroy === 'function') {
      this.chart.destroy();
    }
  },

  watch: {
    value (val) {
      if (this.chart) {
        this.chart.value = val;
        this.chart.draw();
      }
    }
  }
}
</script>

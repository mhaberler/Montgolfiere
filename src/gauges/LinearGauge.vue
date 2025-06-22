<template>
  <canvas class="canvas-gauges"></canvas>
</template>

<script>
import { LinearGauge } from 'canvas-gauges'

const DEFAULT_OPTIONS = {
  width: 300,
  height: 100,
  minValue: 0,
  maxValue: 500,
  barWidth: 10,
  borders: true,
  colorBarProgress: '#00aaff',
  colorBar: '#eeeeee',
  value: 0,
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
      this.chart = new LinearGauge(opts).draw();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('LinearGauge error:', e, opts);
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

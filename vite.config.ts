/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json';
import { qrcode } from 'vite-plugin-qrcode';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy(),
    qrcode(),
    devtoolsJson()
  ],
  build: {
    target: 'esnext', // This enables BigInt support
    minify: 'esbuild',
  },
  esbuild: {
    target: 'esnext', // This also needs to be set for esbuild
    supported: {
      bigint: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})

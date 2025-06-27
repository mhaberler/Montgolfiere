/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { qrcode } from "vite-plugin-qrcode";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue(), legacy(), qrcode(), devtoolsJson()],
    build: {
      target: "esnext", // This enables BigInt support
      minify: mode === "production" ? "esbuild" : false,
    },
    esbuild: {
      target: "esnext", // This also needs to be set for esbuild
      supported: {
        bigint: true,
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
    },
    define: {
      // demo variable
      __API_URL__: JSON.stringify(env.VITE_API_URL),
    },
  };
});

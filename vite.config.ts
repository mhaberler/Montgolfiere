/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { qrcode } from "vite-plugin-qrcode";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
const branchName = execSync("git rev-parse --abbrev-ref HEAD")
  .toString()
  .trim();
const buildDate = execSync("date -u +%Y-%m-%dT%H:%M:%SZ").toString().trim();

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
      __GIT_COMMIT_HASH__: JSON.stringify(commitHash),
      __GIT_BRANCH_NAME__: JSON.stringify(branchName),
      __VITE_BUILD_DATE__: JSON.stringify(buildDate),
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
  };
});

var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { qrcode } from "vite-plugin-qrcode";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import tailwindcss from "@tailwindcss/vite";
var packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
var commitHash = execSync("git rev-parse --short HEAD").toString().trim();
var commitMessage = execSync("git log -1  '--pretty=%B'").toString().trim();
var branchName = execSync("git rev-parse --abbrev-ref HEAD")
    .toString()
    .trim();
// Get current git tag if available
var gitTag = "";
try {
    gitTag = execSync("git describe --tags --exact-match HEAD 2>/dev/null || echo ''")
        .toString()
        .trim();
}
catch (error) {
    gitTag = "";
}
var buildDate = execSync("date -u +%Y-%m-%dT%H:%M:%SZ").toString().trim();
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load env file based on `mode` in the current working directory.
    var env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: __spreadArray([
            vue(),
            qrcode(),
            tailwindcss()
        ], (mode === "development"
            ? [
                devtoolsJson(),
                // vueDevTools()
            ]
            : []), true),
        optimizeDeps: {
            exclude: ["capacitor-barometer"],
            include: ["@ionic/vue", "@ionic/vue/css/core.css"],
        },
        build: {
            target: "esnext", // This enables BigInt support
            minify: mode === "production" ? "esbuild" : false,
            // Suppress warning for large chunks that are already optimized
            // ionic: 609KB (131KB gzipped) - core framework
            // mqtt: 365KB (109KB gzipped) - lazy-loaded
            chunkSizeWarningLimit: 700,
            commonjsOptions: {
                include: [/node_modules/],
            },
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        // MQTT client - large library, split out
                        if (id.includes("node_modules/mqtt")) {
                            return "mqtt";
                        }
                        // D3 - large visualization library
                        if (id.includes("node_modules/d3")) {
                            return "d3";
                        }
                        // MathJS - very large math library
                        if (id.includes("node_modules/mathjs")) {
                            return "mathjs";
                        }
                        // PMTiles - map tiles library
                        if (id.includes("node_modules/pmtiles")) {
                            return "pmtiles";
                        }
                        // Ionic framework - keep together
                        if (id.includes("node_modules/@ionic/vue") ||
                            id.includes("node_modules/@ionic/core")) {
                            return "ionic";
                        }
                        // Capacitor plugins - group together
                        if (id.includes("node_modules/@capacitor") ||
                            id.includes("node_modules/@capawesome") ||
                            id.includes("node_modules/@capgo")) {
                            return "capacitor";
                        }
                        // Vue core - separate chunk
                        if (id.includes("node_modules/vue") &&
                            !id.includes("@ionic") &&
                            !id.includes("vue-router")) {
                            return "vue";
                        }
                        // VueUse utilities
                        if (id.includes("node_modules/@vueuse")) {
                            return "vueuse";
                        }
                        // Other vendor libraries
                        if (id.includes("node_modules")) {
                            return "vendor";
                        }
                    },
                },
            },
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
            __GIT_COMMIT_HASH__: JSON.stringify(commitHash),
            __GIT_COMMIT_MESSAGE__: JSON.stringify(commitMessage),
            __GIT_BRANCH_NAME__: JSON.stringify(branchName),
            __GIT_TAG__: JSON.stringify(gitTag),
            __VITE_BUILD_DATE__: JSON.stringify(buildDate),
            __APP_VERSION__: JSON.stringify(packageJson.version),
        },
    };
});

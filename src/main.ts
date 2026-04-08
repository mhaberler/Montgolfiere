import { createApp } from "vue";
import App from "./App.vue";
import "./assets/style.css";

import router from "./router";

/* Theme variables */
import "./theme/variables.css";

/* Tailwind import */
// import "./assets/main.css";

import { initializeApp } from "./utils/startup";
import { vOnLongPress } from "@vueuse/components";

// Add global error handling for unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  // Don't prevent the error from being logged, but don't crash the app
  if (
    event.reason &&
    event.reason instanceof Error &&
    event.reason.message &&
    event.reason.message.includes("vnode")
  ) {
    console.warn("Caught vnode error during app reload - this is expected");
    event.preventDefault(); // Prevent the error from crashing the app
  }
});

// // Add global error handler for Vue errors
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
  if (
    event.error &&
    event.error instanceof Error &&
    event.error.message &&
    event.error.message.includes("vnode")
  ) {
    console.warn("Caught vnode error - this is expected during app reload");
    event.preventDefault(); // Prevent the error from crashing the app
  }
});

initializeApp();

const app = createApp(App).use(router);

// Register the directive globally
app.directive("on-long-press", vOnLongPress);

// Add Vue error handler
app.config.errorHandler = (err, instance, info) => {
  console.error("Vue error:", err);
  console.error("Component instance:", instance);
  console.error("Error info:", info);

  // Don't crash the app for vnode errors during reload
  if (
    err &&
    err instanceof Error &&
    err.message &&
    err.message.includes("vnode")
  ) {
    console.warn("Caught Vue vnode error - this is expected during app reload");
    return;
  }

  // Re-throw other errors
  throw err;
};

router.isReady().then(() => {
  app.mount("#app");
});

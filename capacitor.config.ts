import type { CapacitorConfig } from "@capacitor/cli";
import pkg from "./package.json";

const config: CapacitorConfig = {
  appId: "com.haberler.montgolfiere",
  appName: "Montgolfiere",
  webDir: "dist",
  loggingBehavior: "none", // <--- Add this line
  // Or for production builds only:
  // loggingBehavior: 'debug', // or 'production' if you want logs always
  // android: {
  //   loggingBehavior: 'none' // Override for Android if needed
  // },
  // ios: {
  //   loggingBehavior: 'none' // Override for iOS if needed
  // }

  server: {
    allowNavigation: [
      "ws://10.*.*.*:*",    // Allow your local subnets
      "ws://172.16.0.*:*", 
      "ws://192.168.*.*:*"  // Common local networks
    ],
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH || "./debug.keystore", // Fallback to a debug keystore for development

      // Keystore Password
      // Read from process.env.ANDROID_KEYSTORE_PASSWORD
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD || "android", // Fallback for debug

      // Keystore Alias
      // Read from process.env.ANDROID_KEYSTORE_ALIAS
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || "androiddebugkey", // Fallback for debug

      // Keystore Alias Password
      // Read from process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD
      keystoreAliasPassword:
        process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD || "android", // Fallback for debug
    },
    webContentsDebuggingEnabled: true,
  },
  ios: {
    minVersion: '16.0'
  },
  plugins: {
    extConfig: {},
    StatusBar: {
      overlaysWebView: false,
      // style: "DARK",
      // backgroundColor: "#ffffffff",
    },
  },
};

export default config;

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
    minVersion: '15.5'
  },
  plugins: {
    extConfig: {},
    CapacitorUpdater: {
      version: pkg.version,
      appId: "com.haberler.montgolfiere",
      defaultChannel: "development",
      autoUpdate: false,
      autoDeleteFailed: true,
      resetWhenUpdate: true, // new appstore version -> native
      // publicKey: process.env.MONTGOLFIERE_PUBLIC_KEY,
      publicKey:
        "-----BEGIN RSA PUBLIC KEY-----\nMIIBCgKCAQEA7Q3ei2rTD/qRDwfYGcaccuuSR2E+2IyeZcX34VWTNgtX//hzlYLt\nEVyVN7oAP6wFqQBIxfkp06Mzu3T/kW0cMcvVW8g6A1nQKVUES5NLAMZm50ZhrTWS\nImFJUKftebdmL4tjD0uWtm/0DCh7AJXGSrlD5bC82VOt0nM8/oY3n9T/72TljKoc\n494bURriGNGc0eEImAklIyaLVoT8kuWdIWGrD3jvRZpHJQFON/cRsVSmSCk9Fi3c\nRlGrhFPllqIvBaZEnPoO+ypvt6arTlA7uxlAUa/5LSD6wd0UXbXFAtAcj8lOHgRS\n3xsDPHLcChq4Rp+jMQY3H0Gw1ua9edKIowIDAQAB\n-----END RSA PUBLIC KEY-----\n",
    },
    StatusBar: {
      overlaysWebView: false,
      // style: "DARK",
      // backgroundColor: "#ffffffff",
    },
  },
};

export default config;

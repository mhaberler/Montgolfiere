import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

const config: CapacitorConfig = {
  appId: 'com.haberler.montgolfiere',
  appName: 'Montgolfiere',
  webDir: 'dist',
  // bundledWebRuntime: false,
  server: {
    // This is usually only set for a *specific* remote server, not for local dev.
    // During live reload, the CLI overrides this to point to your local dev server.
    // url: 'http://my-remote-server.com',
    cleartext: true // Required if your dev server is HTTP (not HTTPS)
  },

  android: {
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH || './debug.keystore', // Fallback to a debug keystore for development

      // Keystore Password
      // Read from process.env.ANDROID_KEYSTORE_PASSWORD
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD || 'android', // Fallback for debug

      // Keystore Alias
      // Read from process.env.ANDROID_KEYSTORE_ALIAS
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || 'androiddebugkey', // Fallback for debug

      // Keystore Alias Password
      // Read from process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD
      keystoreAliasPassword: process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD || 'android', // Fallback for debug
    },
    webContentsDebuggingEnabled: true
  }
};

export default config;

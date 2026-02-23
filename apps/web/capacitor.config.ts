import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // App identity — must match your Play Store / developer account
  appId: 'com.awaves.app',
  appName: 'awaves',

  // --- URL wrapper mode (recommended for this app) ---
  // The app loads your deployed web URL inside the WebView.
  // Replace with your actual production URL before building.
  server: {
    // url: 'https://awaves.net', // production deployment endpoint
    // Using localhost + adb reverse: run once per emulator session before testing:
    //   adb reverse tcp:3000 tcp:3000
    //   adb reverse tcp:8001 tcp:8001
    // This maps emulator localhost → host localhost, so browser and emulator use same URL.
    url: 'http://localhost:3000',
    cleartext: true,
  },

  // --- Static bundle mode (alternative, requires `next build && next export`) ---
  // Uncomment the line below and comment out `server` above if you want to
  // bundle the static files inside the APK (offline-capable app shell).
  // webDir: 'out',

  android: {
    buildOptions: {
      // Use release for Play Store uploads
      keystorePath: undefined,         // set path to your .jks file for signed builds
      keystoreAlias: undefined,
      releaseType: 'APK',
    },
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#094074',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Light',
      backgroundColor: '#094074',
    },
  },
};

export default config;

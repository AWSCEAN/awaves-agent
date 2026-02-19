import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.awaves.app',
  appName: 'AWAVES',
  webDir: '../web/out',
  // DEV ONLY: uncomment to use live-reload from Next.js dev server (pnpm --filter web dev)
  // server: {
  //   url: 'http://10.0.2.2:3000',   // Android emulator → host localhost
  //   cleartext: true,
  // },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#094074',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#faf6ef',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;

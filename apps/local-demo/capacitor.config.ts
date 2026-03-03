import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.awaves.demo',
  appName: 'AWAVES Demo',
  webDir: 'dist',
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  server: {
    // For local dev with `cap run android` — allows live reload from host
    // Comment this out when building a release APK
    // url: 'http://192.168.x.x:5173',
    cleartext: false,
  },
};

export default config;

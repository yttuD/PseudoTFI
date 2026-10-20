import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'ar.com.rendo.app',
  appName: 'Rendo',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.36:3000',
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111827',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    Haptics: {},
  },
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: true,
  },
};

export default config;

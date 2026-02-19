'use client';

import { useEffect } from 'react';
import { isCapacitor } from '@/lib/capacitor';

/**
 * Initializes Capacitor-specific features when running as a native app.
 * Uses the global Capacitor.Plugins API to avoid @capacitor/* imports
 * that would fail the web build when packages aren't installed.
 * No-op when running in a regular browser.
 */
export default function CapacitorInit() {
  useEffect(() => {
    if (!isCapacitor()) return;

    const cap = (window as any).Capacitor;
    if (!cap?.Plugins) return;

    const initCapacitor = async () => {
      try {
        const { StatusBar } = cap.Plugins;
        if (StatusBar) {
          await StatusBar.setStyle({ style: 'LIGHT' });
          await StatusBar.setBackgroundColor({ color: '#094074' });
        }
      } catch {
        // StatusBar plugin not available
      }

      try {
        const { SplashScreen } = cap.Plugins;
        if (SplashScreen) {
          await SplashScreen.hide();
        }
      } catch {
        // SplashScreen plugin not available
      }

      try {
        const { App } = cap.Plugins;
        if (App) {
          App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
            if (canGoBack) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
        }
      } catch {
        // App plugin not available
      }
    };

    initCapacitor();
  }, []);

  return null;
}

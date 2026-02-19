/**
 * Capacitor bridge utilities.
 * Detects Capacitor runtime and provides native API wrappers
 * that fall back to browser APIs when not in Capacitor.
 *
 * No @capacitor/* imports at module level — they are only available
 * inside the Capacitor native shell (apps/mobile/).
 * All Capacitor calls go through the global Capacitor.Plugins API.
 */

export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

export async function requestGeolocation(): Promise<{ lat: number; lng: number } | null> {
  // Fallback: always use browser geolocation API
  // Capacitor's WebView also supports navigator.geolocation
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
    );
  });
}

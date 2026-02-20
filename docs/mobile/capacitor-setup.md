# awaves Android APK Build Guide (Capacitor)

## Overview

awaves uses **Capacitor** to wrap the React/Next.js web app in a native Android WebView and generate an `.apk` / `.aab` file.

**Mode used: URL wrapper** — the APK loads the deployed awaves web app URL inside a WebView.
This is the recommended approach because the app requires a live API backend regardless.

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | nodejs.org |
| Android Studio | Latest | developer.android.com/studio |
| Android SDK | API 33+ | via Android Studio SDK Manager |
| Java JDK | 17 | adoptium.net |
| pnpm | 8+ | already installed |

---

## Step 1: Install Capacitor Dependencies

```bash
cd apps/web

# Install Capacitor core + CLI + Android platform
pnpm add @capacitor/core @capacitor/cli @capacitor/android
pnpm add -D @capacitor/cli

# Optional: splash screen and status bar plugins
pnpm add @capacitor/splash-screen @capacitor/status-bar
```

---

## Step 2: Configure the App URL

Edit [apps/web/capacitor.config.ts](../../apps/web/capacitor.config.ts):

```typescript
server: {
  url: 'https://your-actual-deployed-url.com',  // ← PUT YOUR URL HERE
  cleartext: false,
  androidScheme: 'https',
},
```

> **Note**: If testing locally, you can temporarily use:
> ```typescript
> url: 'http://10.0.2.2:3000'  // Android emulator localhost
> // or
> url: 'http://YOUR_LOCAL_IP:3000'  // physical device on same WiFi
> ```

---

## Step 3: Initialize Capacitor (first time only)

```bash
cd apps/web

# Initialize - this reads from capacitor.config.ts
npx cap init awaves com.awaves.app --web-dir .next

# Add Android platform (creates the android/ folder)
npx cap add android
```

---

## Step 4: Sync (run every time after changing web files)

```bash
cd apps/web
pnpm cap:sync
# or: npx cap sync android
```

---

## Step 5: Open in Android Studio

```bash
cd apps/web
pnpm cap:open
# or: npx cap open android
```

Android Studio will open with the `android/` project.

---

## Step 6: Build APK in Android Studio

### Debug APK (for testing):
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (for Play Store):
1. **Build** → **Generate Signed Bundle / APK**
2. Choose **APK**
3. Create or select your keystore
4. Choose **release** build variant
5. APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## Step 7: Install on Device (sideload for testing)

```bash
# Transfer APK to your phone and install
# OR use ADB:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

On the device:
1. Settings → Security → Enable "Install from Unknown Sources"
2. Transfer the APK file
3. Tap to install

---

## Play Store Requirements

To avoid rejection as a "thin wrapper":

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Splash screen | ✅ Configured in capacitor.config.ts | Add splash image to `android/app/src/main/res/` |
| App icon | ❌ Not configured | Add icons via Android Studio Image Asset tool |
| HTTPS only | ✅ `cleartext: false` | N/A |
| Native features | ⚠️ Basic only | Consider adding `@capacitor/push-notifications` |
| Offline fallback | ❌ Requires internet | Consider Service Worker for offline shell |

---

## Workflow Summary (daily development)

```bash
# 1. After making web changes, sync to Android
cd apps/web && pnpm cap:sync

# 2. Open in Android Studio
pnpm cap:open

# 3. Build APK in Android Studio (Build → Build APK)
```

---

## Troubleshooting

### "cleartext traffic not permitted"
If using a local HTTP server during dev, add to `android/app/src/main/AndroidManifest.xml`:
```xml
android:usesCleartextTraffic="true"
```

### Mapbox not loading in WebView
The Mapbox GL JS requires WebGL. Make sure you're testing on a real device or emulator with GPU acceleration enabled (not a software renderer).

### "Mixed content" errors
Ensure your deployed API uses HTTPS. Set `NEXT_PUBLIC_API_URL=https://api.awaves.app` in your production env.

### Back button behavior
Capacitor handles the back button by navigating the WebView history. If you want custom behavior, add:
```typescript
import { App } from '@capacitor/app';
App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) { App.exitApp(); }
  else { window.history.back(); }
});
```

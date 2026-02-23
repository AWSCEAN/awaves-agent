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

Capacitor v8 dependencies are already installed in `apps/web/package.json`:
- `@capacitor/core ^8.1.0`
- `@capacitor/cli ^8.1.0`
- `@capacitor/android ^8.1.0`

The `android/` project has been initialized. Skip to Step 4 for daily development.

If starting from scratch on a new machine:
```bash
cd apps/web
pnpm install  # installs all deps including Capacitor
```

---

## Step 2: Configure the App URL

The app URL is pre-configured to the mobile EKS subdomain in
[apps/web/capacitor.config.ts](../../apps/web/capacitor.config.ts):

```typescript
server: {
  url: 'https://mobile.awaves.app',  // EKS mobile deployment endpoint
  cleartext: false,
  androidScheme: 'https',
},
```

> **Why `mobile.awaves.app` (not `awaves.app`)?**
> The EKS cluster runs two separate Deployments from the same Docker image:
> - `web.awaves.app` → `react-web` Deployment (browser users, HPA min:2/max:10)
> - `mobile.awaves.app` → `react-mobile` Deployment (APK WebView, HPA min:1/max:3)
>
> This gives the APK an isolated, independently-scalable entry point.
> Static assets (JS/CSS) are served via CloudFront → S3 using `assetPrefix`.
> See [infra/k8s/](../../infra/k8s/) for all Kubernetes manifests.

> **For local testing**, temporarily use:
> ```typescript
> url: 'http://10.0.2.2:3000'  // Android emulator → host machine localhost
> // or
> url: 'http://YOUR_LOCAL_IP:3000'  // physical device on same WiFi
> // Also set: cleartext: true, androidScheme: 'http'
> ```

---

## Step 3: Initialize Capacitor (first time only / new machine)

> **Note:** The `android/` directory is already committed to the repo. On an existing
> clone, skip this step and go to Step 4.

```bash
cd apps/web

# Add Android platform (creates the android/ folder)
# capacitor.config.ts already exists — do NOT run `cap init` again
node_modules/.bin/cap add android

# Create assets directory (required by cap sync on a fresh project)
mkdir -p android/app/src/main/assets

# Sync config into Android project
node_modules/.bin/cap sync android
```

---

## Step 4: Sync (run every time after changing web files or config)

```bash
cd apps/web
pnpm cap:sync
# or: node_modules/.bin/cap sync android
```

---

## Step 5: Open in Android Studio

```bash
cd apps/web
pnpm cap:open
# or: node_modules/.bin/cap open android
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

## EKS Deployment Architecture

The Capacitor APK uses **URL-wrapper mode** — it loads the live web app from AWS EKS
rather than bundling static assets. You must deploy the web app to EKS before testing
against production.

### One Image, Two Deployments

The same Docker image (`awaves-web:latest`) is deployed twice:

| Deployment | Namespace | Replicas | Domain | Users |
|------------|-----------|----------|--------|-------|
| `react-web` | `web` | min:2, max:10 | `web.awaves.app` | Browser |
| `react-mobile` | `mobile` | min:1, max:3 | `mobile.awaves.app` | APK WebView |

### Build and Push Docker Image

```bash
# From monorepo root — NEXT_PUBLIC_* must be passed as build args
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_CDN_URL=https://cdn.awaves.app \
  --build-arg NEXT_PUBLIC_API_URL=https://api.awaves.app \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.YOUR_TOKEN_HERE \
  -t awaves-web:latest .

docker tag awaves-web:latest <ECR_REGISTRY>/awaves-web:latest
docker push <ECR_REGISTRY>/awaves-web:latest
```

### Sync Static Assets to S3 (run after every build)

```bash
# After next build, sync static assets to S3 before deploying to EKS
aws s3 sync apps/web/.next/static/ s3://<YOUR-S3-BUCKET>/_next/static/ \
  --cache-control "public,max-age=31536000,immutable" \
  --region ap-northeast-2
```

### Deploy to EKS

```bash
# Replace <ECR_REGISTRY> and <ACM_CERT_ARN> in the YAML files first
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/web-deployment.yaml
kubectl apply -f infra/k8s/mobile-deployment.yaml
kubectl apply -f infra/k8s/web-service.yaml
kubectl apply -f infra/k8s/mobile-service.yaml
kubectl apply -f infra/k8s/ingress.yaml
kubectl apply -f infra/k8s/web-hpa.yaml
kubectl apply -f infra/k8s/mobile-hpa.yaml

# Verify
kubectl get pods -n web && kubectl get pods -n mobile
kubectl get ingress -n web && kubectl get ingress -n mobile
```

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

# ACE-55b: Pre-Test Fixes — Android Emulator + Browser Dev

## Status: COMPLETED ✅
## Date: 2026-02-22
## Branch: feature/ACE-55

---

## Context

Full codebase analysis (3-agent sweep) identified 3 critical bugs preventing the APK from building/running and 2 important workflow issues for local dev. All 3 code fixes have been applied.

---

## Bugs Fixed

### Fix 1 — `AndroidManifest.xml`: Missing cleartext HTTP permission
**File:** `apps/web/android/app/src/main/AndroidManifest.xml`

On Android 9+ (API 28+), cleartext HTTP is blocked by default. The target SDK is 36 (Android 15). Without this fix, the WebView cannot load `http://10.0.2.2:3000` — the app shows a blank screen.

Added to `<application>` tag:
```xml
android:usesCleartextTraffic="true"
android:networkSecurityConfig="@xml/network_security_config"
```

---

### Fix 2 — Created `network_security_config.xml`
**File:** `apps/web/android/app/src/main/res/xml/network_security_config.xml` *(new)*

Capacitor's `cleartext: true` in `capacitor.config.ts` does **not** auto-create this file. Created manually with scoped cleartext rule — only `10.0.2.2` (emulator alias) allows HTTP; all other domains are HTTPS-only.

```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">10.0.2.2</domain>
    </domain-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

---

### Fix 3 — Created `colors.xml`
**File:** `apps/web/android/app/src/main/res/values/colors.xml` *(new)*

`styles.xml` references `@color/colorPrimary`, `@color/colorPrimaryDark`, `@color/colorAccent`. These were undefined → Gradle build error. Created with awaves brand palette:
- `colorPrimary: #094074` (ocean blue)
- `colorPrimaryDark: #062E55`
- `colorAccent: #1B8FC4`

---

## Files Changed

| File | Action |
|------|--------|
| `apps/web/android/app/src/main/AndroidManifest.xml` | Edit — 2 attributes added to `<application>` |
| `apps/web/android/app/src/main/res/xml/network_security_config.xml` | Create |
| `apps/web/android/app/src/main/res/values/colors.xml` | Create |

---

## Testing Guide

### One-Time AVD Setup (required for Mapbox GL)

Mapbox GL requires WebGL. The default Android emulator uses a software renderer — the map will be blank. Fix:

1. Android Studio → **Device Manager** → ✏️ pencil next to your AVD
2. **Show Advanced Settings**
3. **Graphics:** set to `Hardware - GLES 2.0`
4. Click Finish → restart the AVD

---

### Testing Mode: Android Emulator

**Config state (currently correct — do not change):**

| File | Setting |
|------|---------|
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL=http://10.0.2.2:8001` |
| `apps/web/capacitor.config.ts` | `url: 'http://10.0.2.2:3000'`, `cleartext: true`, `androidScheme: 'http'` |

**Steps every test session:**

```bash
# Terminal 1 — Backend (must bind to 0.0.0.0 so emulator can reach it)
cd apps/api
.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2 — Frontend (must bind to 0.0.0.0 so emulator can reach it)
cd apps/web
pnpm dev --hostname 0.0.0.0 --port 3000

# Terminal 3 — Sync Capacitor and open Android Studio
cd apps/web
node_modules/.bin/cap sync android
```

In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)** → then **Run ▶**

**Checklist:**
- [ ] Splash screen shows awaves logo on `#094074` blue background (2s)
- [ ] Login page loads (no blank screen, no SSL/cleartext error)
- [ ] Login succeeds → redirect to map
- [ ] Mapbox map renders with surf spot markers
- [ ] Search bar returns results
- [ ] Tap spot → detail panel opens (search results hidden on mobile)
- [ ] Save spot → heart fills, appears on Saved page
- [ ] Back button navigates WebView history

---

### Testing Mode: Browser Dev (Desktop)

**Before browser testing — edit `apps/web/.env.local`:**
```env
# Change from:
NEXT_PUBLIC_API_URL=http://10.0.2.2:8001

# To:
NEXT_PUBLIC_API_URL=http://localhost:8001
```

```bash
# Terminal 1
cd apps/api
.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Terminal 2
cd apps/web
pnpm dev
```

Open: `http://localhost:3000`

**After browser testing — revert `apps/web/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://10.0.2.2:8001
```

---

### Config Quick Reference

| Scenario | `apps/web/.env.local` | `capacitor.config.ts` server.url | Backend flag |
|----------|----------------------|----------------------------------|--------------|
| Android emulator | `http://10.0.2.2:8001` | `http://10.0.2.2:3000` | `--host 0.0.0.0` |
| Browser (localhost) | `http://localhost:8001` | *(irrelevant)* | default |
| Physical device (WiFi) | `http://192.168.x.x:8001` | `http://192.168.x.x:3000` | `--host 0.0.0.0` |
| Production EKS | baked via Docker build-arg | `https://mobile.awaves.app` | EKS pod |

---

## Known Limitations (not bugs)

| Item | Notes |
|------|-------|
| `pnpm build` fails locally (EPERM symlink) | `output: 'standalone'` requires symlinks. Enable Windows Developer Mode or use Docker (Linux) for production builds. |
| Mapbox blank without GPU in AVD | Enable `Hardware - GLES 2.0` in AVD Advanced Settings. Real devices work automatically. |
| `NEXT_PUBLIC_API_URL` must be switched manually | `10.0.2.2` works only in emulator; `localhost` works only in browser. |

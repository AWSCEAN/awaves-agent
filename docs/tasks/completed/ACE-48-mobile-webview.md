# ACE-48: Mobile WebView Responsive Redesign — COMPLETED

## Status: COMPLETED ✅
## Branch: feature/ACE-48
## Date: 2026-02-19
## Agents: Frontend Dev → Review → QA → Docs

---

## Summary

Converted the awaves web app from desktop-only to fully mobile-responsive and WebView-ready for Android APK packaging via Capacitor.

---

## Changes Implemented

### Phase 1 — Critical Fixes

| File | Change |
|------|--------|
| `apps/web/app/layout.tsx` | Added `Viewport` export with `width=device-width`, `initialScale=1`, `themeColor` |
| `apps/web/app/globals.css` | Added `slide-up`, `slide-down` animations; mobile-aware CSS; safe area; mapbox control offsets |
| `apps/web/components/LogoOverlay.tsx` | Removed `position:fixed z-9999` — now normal document flow; letter hidden on mobile |
| `apps/web/components/SpotDetailPanel.tsx` | Mobile bottom sheet (full-width, `max-h-85vh`, `rounded-t-2xl`, drag handle); desktop: side panel unchanged |
| `apps/web/components/TimeSlotPickerPanel.tsx` | Same bottom sheet pattern |
| `apps/web/components/SearchResultsList.tsx` | Same bottom sheet pattern; removed unused `SurferLevel` import |
| `apps/web/components/PredictionResultPanel.tsx` | Same bottom sheet pattern; added `overflow-y-auto` |

### Phase 1 — Map Page Header

| Change | Detail |
|--------|--------|
| Removed `ml-48` hack | Logo no longer needs offset — it's in normal flow |
| Mobile header row | `md:hidden` — logo + search icon + surf toggle + lang + saved + mypage icons |
| Mobile search drawer | Slides down below header with all search controls stacked vertically |
| Desktop header | `hidden md:flex` — unchanged from original |
| `isMobile` state | `matchMedia('max-width:767px')` with proper cleanup for date selector centering |
| `showMobileSearch` state | Toggles mobile search drawer open/closed |

### Phase 2 — Other Pages

| File | Change |
|------|--------|
| `apps/web/app/saved/page.tsx` | Moved `LogoOverlay` inside header; `justify-between` |
| `apps/web/app/mypage/page.tsx` | Same; `pt-24→pt-16` |
| `apps/web/app/login/page.tsx` | Side-by-side layout → `flex-col md:flex-row`; card `w-full md:w-[480px]` |
| `apps/web/app/register/page.tsx` | Same as login |
| `apps/web/app/page.tsx` | Logo in header; features `grid-cols-1 md:grid-cols-3`; smaller hero on mobile |

### Phase 3 — Capacitor APK Setup

| File | Detail |
|------|--------|
| `apps/web/capacitor.config.ts` | URL wrapper config (`com.awaves.app`); splash screen; status bar |
| `apps/web/package.json` | Added `cap:sync`, `cap:open`, `cap:build` scripts |
| `apps/web/tsconfig.json` | Excluded `capacitor.config.ts` from TS compilation (deps not installed yet) |
| `docs/mobile/capacitor-setup.md` | Full step-by-step APK build guide |

---

## Review Findings & Resolutions

| Issue | Severity | Resolution |
|-------|----------|------------|
| `userScalable:false` blocks zoom | MAJOR | Removed — viewport is now `width=device-width, initialScale=1` only |
| Dual animation on desktop (`animate-slide-up` + `md:animate-slide-in-*`) | MAJOR | Added `md:animate-none` before `md:animate-slide-in-*` on all panels |
| Unused `dateStr` in `handleSearch` | MINOR | Removed |
| Blanket `min-height:40px` breaks chart buttons | MINOR | Scoped to `header button`, `header a`, and `.btn-*` classes only |

---

## Mobile Layout Architecture

```
MOBILE (< 768px):              DESKTOP (≥ 768px):
┌──────────────────────┐       ┌─────────────────────────────────────┐
│ [Logo][🔍][⚡][KO]   │       │ [Logo] [Loc][Date][Time][Lvl][Search] [KO][Saved][👤] │
│       [♥][👤]        │       ├──────────────────────────────────────┤
├──────────────────────┤       │[Results]  MAP  [Detail/TimeSlot Panel]│
│ [Search drawer opens │       │  w-96          w-[420px] right-0     │
│  below on tap]       │       │  left-0                              │
├──────────────────────┤       └──────────────────────────────────────┘
│                      │
│    MAP (full screen) │
│                      │
│   [Date selector]    │
├──────────────────────┤
│  BOTTOM SHEET        │  ← All panels (results/detail/prediction/timeslot)
│  max-h-[80-85vh]     │    slide up from bottom
│  drag handle + scroll│
└──────────────────────┘
```

---

## Next Steps (Post-APK)

1. **Deploy** the web app to production (`https://awaves.app`)
2. **Install Capacitor**: `cd apps/web && pnpm add @capacitor/core @capacitor/cli @capacitor/android`
3. **Init & build**: Follow `docs/mobile/capacitor-setup.md`
4. **Add app icons** via Android Studio Image Asset tool
5. **Play Store**: Sign release APK, upload `.aab`

---

## Agent Sign-off

- **Frontend Dev**: ✅ All UI changes implemented
- **Review**: ✅ MAJOR issues fixed (accessibility, dual animation)
- **QA**: ✅ `tsc --noEmit` passes with 0 errors
- **Docs**: ✅ Task completed and documented

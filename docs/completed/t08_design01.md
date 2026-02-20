# T08 Design Update - Layout & Animation Changes

**Task ID:** T08_DESIGN01
**Status:** Completed
**Date:** 2026-02-05

---

## Summary

Updated layout/spacing for the awaves web application pages including main landing page, login, and register pages. Added logo animations and restructured page layouts.

---

## Changes Made

### 1. Main Page (`apps/web/app/page.tsx`)

#### LogoOverlay Component
- Created fixed-position logo overlay in top-left corner
- Contains `awaves_letter.svg` (20px height) and `awaves_logo.svg` (36px height)
- Fixed positioning with z-index 9999
- Pointer-events disabled to prevent interaction interference

```jsx
function LogoOverlay() {
  return (
    <div style={{
      position: 'fixed',
      top: '4px',
      left: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 16px',
      height: '48px',
      pointerEvents: 'none',
    }}>
      <Image src="/awaves_letter.svg" ... />
      <Image src="/awaves_logo.svg" ... />
    </div>
  );
}
```

#### Hero Section
- Main logo (`awaves_main.svg`) centered above headline
- Max width: 280px
- Added `animate-ripple` animation class

---

### 2. Login Page (`apps/web/app/login/page.tsx`)

#### Layout Changes
- Horizontal flex layout with logo on left, form on right
- Gap between logo and card: 96px (`gap-24`)
- Card width: fixed 480px (`w-[480px]`)
- Logo size: 180px max-width with `animate-ripple` animation
- Logo links to home page (`/`)

---

### 3. Register Page (`apps/web/app/register/page.tsx`)

#### Layout Changes
- Same horizontal layout as login page
- Gap: 96px (`gap-24`)
- Card width: 480px (`w-[480px]`)
- Logo: 180px with ripple animation
- Logo links to home page

---

### 4. Global Styles (`apps/web/app/globals.css`)

#### Ripple Animation
Added subtle wave-like animation for logo images:

```css
@keyframes ripple-wave {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-3px) rotate(0.5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(3px) rotate(-0.5deg);
  }
}

.animate-ripple {
  animation: ripple-wave 4s ease-in-out infinite;
}
```

- Duration: 4 seconds
- Easing: ease-in-out
- Motion: vertical translation (±3px) + subtle rotation (±0.5deg)

---

### 5. Logo Files (`apps/web/public/`)

Added logo SVG files:
- `awaves_logo.svg` - Icon logo for header
- `awaves_letter.svg` - Text logo for header
- `awaves_main.svg` - Combined logo for hero/login/register

---

## Files Modified

| File | Change Type |
|------|-------------|
| `apps/web/app/page.tsx` | Modified - LogoOverlay, hero layout |
| `apps/web/app/login/page.tsx` | Modified - Horizontal layout |
| `apps/web/app/register/page.tsx` | Modified - Horizontal layout |
| `apps/web/app/globals.css` | Modified - Added ripple animation |
| `apps/web/public/awaves_logo.svg` | Added |
| `apps/web/public/awaves_letter.svg` | Added |
| `apps/web/public/awaves_main.svg` | Added |

---

## Design Specifications

### Colors
- No color changes (preserved existing theme)

### Typography
- No font changes (preserved IBM Plex Sans KR)

### Spacing
| Element | Value |
|---------|-------|
| Logo-Card gap (login/register) | 96px |
| Card width | 480px |
| Header logo height | 48px container |
| Main logo max-width | 280px (hero), 180px (login/register) |

### Animation
| Property | Value |
|----------|-------|
| Duration | 4s |
| Timing | ease-in-out |
| Iteration | infinite |
| Y-translation | ±3px |
| Rotation | ±0.5deg |

---

## Testing Notes

- Verify logo animation renders smoothly on all pages
- Check responsive behavior on smaller screens
- Ensure fixed header logo doesn't interfere with page interactions

---

## Sign-off

- [x] Frontend implementation complete
- [x] Animation effects working
- [x] Layout consistent across login/register pages

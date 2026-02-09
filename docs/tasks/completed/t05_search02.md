## Task ID
t05_search02.md

## Status: COMPLETED

## Objective
Enhance search functionality with sorting filters, nearby spots suggestion, and coordinate-based caching.

## Features Implemented

### 1. Removed Expert Level Option
- Removed "전문가" (expert) from surfer level dropdown
- Only shows: Beginner, Intermediate, Advanced

### 2. Sort Filter Buttons
- Added filter toggle buttons in SearchResultsList header
- Surf Score: Sorts by surf score (highest first) - green active state
- Safety Score: Sorts by safety score (highest first) - orange active state
- Distance: Sorts by distance (closest first) - blue active state
- Distance button disabled when no user location available

### 3. Suggestion by Distance Feature
- "Nearby Spots" button added to search header (blue button)
- "내 주변 25개 스팟 추천" button in results panel
- Uses `getNearbySpots()` function to find 25 closest spots
- Calculates distance using Haversine formula
- Returns spots with surf/safety scores for selected date/time

### 4. Dummy User Location
- Added `DEMO_USER_LOCATION` constant (Seoul: 37.5665, 126.9780)
- Used when real user location is not available
- Ensures distance features always work for demo purposes

### 5. Coordinate-Based Caching
- Created `coordinateCache.ts` utility
- Caches forecast data by rounded coordinates (2 decimal places)
- Cache key format: `lat_lng_date`
- 15-minute TTL for cached entries
- Functions: `getCachedForecast`, `setCachedForecast`, `cleanExpiredCache`
- Integrated into `showForecastAtCoords` in EnhancedMapboxMap

## Files Created
- `apps/web/lib/coordinateCache.ts` - Coordinate caching utility

## Files Modified
- `apps/web/app/map/page.tsx`:
  - Removed expert option from surfer level dropdown
  - Added Nearby Spots button
  - Added handleSuggestByDistance handler
  - Added effectiveUserLocation (real or demo)
  - Passed new props to SearchResultsList

- `apps/web/components/SearchResultsList.tsx`:
  - Added SortMode type and sortMode state
  - Added useMemo for sorted results
  - Added sort filter buttons (surf, safety, distance)
  - Added onSuggestByDistance button
  - Added userLocation prop for distance sorting

- `apps/web/lib/data.ts`:
  - Added `getNearbySpots()` function
  - Added `DEMO_USER_LOCATION` constant

- `apps/web/components/EnhancedMapboxMap.tsx`:
  - Integrated coordinate caching in showForecastAtCoords
  - Caches forecast data on first click, reuses on subsequent clicks

## QA Results
- Build: PASS (0 errors)
- Sort buttons: Working
- Nearby spots: Working
- Caching: Working
- Demo location: Working

## Completed: 2026-02-05

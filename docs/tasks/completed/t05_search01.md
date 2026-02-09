## Task ID
t05_search01.md

## Status: COMPLETED

## Objective
Implement search functionality for surf spots with filtering capabilities.

## Features Implemented

### 1. Search by Location
- Location autocomplete component (`LocationAutocomplete.tsx`)
- Searches by spot name, Korean name, region, and country
- Fuzzy matching for user convenience

### 2. Date and Time Selection
- 10-day date picker in header
- Time slot selection (06:00, 09:00, 12:00, 15:00, 18:00)
- Forecasts adjust based on selected date/time

### 3. Surfer Level Filter
- Filter spots by difficulty level
- Options: Beginner, Intermediate, Advanced
- Shows spots appropriate for user's skill level

### 4. Search Results List
- Ranked results sorted by surf score
- Shows surf score and safety score with color indicators
- Pagination (25 items per page)
- Save spot functionality
- Click to center map on spot

### 5. Distance Calculation
- Haversine formula for accurate distance
- Distance shown when user location is available
- User location permission prompt on first search

## Files Created/Modified
- `apps/web/components/LocationAutocomplete.tsx` - Location search input
- `apps/web/components/SearchResultsList.tsx` - Results panel
- `apps/web/lib/data.ts` - Search functions and mock data
- `apps/web/app/map/page.tsx` - Integrated search UI

## Missing Features (To be added in t05_search02)
- Suggestion by Distance button (25 nearby spots)
- Filter toggle buttons for surf score, safety score, distance
- Info panel instead of popup on spot click
- Coordinate-based caching

## Completed: 2026-02-05

# Map Integration Features - Task t06_map01

This document describes the comprehensive map integration features implemented for the AWAVES project.

## Features Implemented

### 1. Map API & Plugins

#### Mapbox GL JS
- **Integration**: Full Mapbox GL JS integration with custom styling
- **Style**: Using `outdoors-v12` style optimized for surf spots
- **Controls**: Navigation controls (zoom, rotate, pitch)

#### Mapbox Geocoder
- **Search**: Location search using Mapbox Geocoder
- **Positioning**: Top-left corner of the map
- **Functionality**: Click on search results to fly to location

#### Geolocation
- **User Location**: Built-in geolocation control
- **Access**: "my_location" button in top-right corner
- **Tracking**: Shows user heading and position

#### Distance Measurement
- **Tool**: Measure distance feature using Turf.js
- **Usage**: Click "Measure Distance" button, then click points on map
- **Display**: Shows distance in kilometers using `turf.length`
- **Clear**: Button to clear measurement points

### 2. Saved Spots with Heart Markers

#### Mock Data
- **Storage**: localStorage for persistence
- **Initial Data**: 3 pre-configured saved spots
- **Markers**: Red heart emoji (❤️) markers

#### Saved Spot Locations
1. **Jukdo Beach** (38.0765°N, 128.6234°E)
2. **Songjeong Beach** (35.1789°N, 129.2001°E)
3. **Custom Spot 1** (37.5°N, 129.0°E)

#### Features
- Heart markers distinguish saved spots from regular surf spots
- Click heart markers to view forecast information
- Notes field for personal annotations

### 3. Map Click Interaction

#### Click to View Forecast
- **Behavior**: Click anywhere on map to get surf information
- **Data Source**: Mock data with 10-day forecast
- **API Integration**: Open-Meteo API for real weather data (optional)

#### Displayed Information
- Surf Score (1-5)
- Safety Score (1-5)
- Wave height and max height
- Wave period
- Wind speed and direction
- Water temperature
- Air temperature
- Swell information

### 4. Date Selection Overlay

#### 10-Day Forecast
- **Component**: `DateSelector` at top of map
- **Range**: Today + 9 days
- **Display**: Scrollable horizontal date picker
- **Selection**: Click date to view forecast for that day

#### Date Labels
- Day 0: "Today"
- Day 1: "Tomorrow"
- Day 2-9: Day abbreviation (Mon, Tue, etc.)

### 5. Weather Overlay

#### Surf Condition Display
- **Scores**: Surf score and safety score for selected date
- **Color Coding**:
  - Green (4-5): Good/Safe
  - Yellow (3): Fair/Moderate
  - Red (1-2): Poor/Caution

#### Wind Particle Animation
- **Component**: `WindParticles`
- **Toggle**: "Wind Particles" button in header
- **Visualization**: Animated particles showing wind direction and speed
- **Canvas**: HTML5 Canvas overlay on map
- **Performance**: Optimized with requestAnimationFrame

#### Particle Behavior
- Number of particles scales with wind speed
- Particle direction matches wind direction
- Fade effect based on particle age
- Auto-respawn when particles expire

### 6. Mock Authentication

#### Test Credentials
- **Username**: `testuser`
- **Password**: `testuser`
- **Service**: `mockAuthService` in `lib/mockAuth.ts`

#### Mock User Data
```json
{
  "id": "test-user-001",
  "email": "testuser@awaves.com",
  "nickname": "Test User",
  "preferredLanguage": "en"
}
```

### 7. Surf Spot Markers

#### Regular Spots
- **Icon**: Surfer emoji (🏄)
- **Color**: Blue (#0091c3)
- **Selected**: Red (#ff6b6b)
- **Data**: From `mockSpots` in `lib/data.ts`

#### Interactions
- **Hover**: Scale animation (1.2x)
- **Click**: Show popup with surf information
- **Fly-to**: Camera flies to selected spot

## Technical Implementation

### Type Definitions

All types defined in `packages/shared/src/index.ts`:
- `SavedSpotMarker`
- `SurfForecast`
- `LocationForecast`
- `WeatherOverlayData`
- `MeasureDistancePoint`
- `WindParticle`

### Components

1. **EnhancedMapboxMap.tsx** - Main map component with all features
2. **DateSelector.tsx** - 10-day date picker
3. **WindParticles.tsx** - Wind visualization
4. **ForecastPopup.tsx** - Forecast information display
5. **SpotPopup.tsx** - Surf spot information popup

### Services

1. **mockAuth.ts** - Mock authentication service
2. **openMeteoService.ts** - Open-Meteo API integration
3. **mockForecastData.ts** - Mock forecast generation and storage

### Data Flow

```
User Action → Map Component → Service/API → Data Update → UI Update
```

## Environment Variables

Required in `apps/web/.env.local`:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## Dependencies Added

- `@turf/length`: Distance calculation
- `@turf/helpers`: GeoJSON helpers
- `@mapbox/mapbox-gl-geocoder`: Location search
- Existing: `mapbox-gl`, `date-fns`

## Usage Instructions

### Login
1. Navigate to `/login`
2. Enter username: `testuser`
3. Enter password: `testuser`
4. Click "Login"

### View Map
1. Map loads with Korea centered
2. Blue markers show surf spots
3. Red heart markers show saved spots

### Search Location
1. Use search box in top-left corner
2. Type location name
3. Select from results

### Measure Distance
1. Click "Measure Distance" button
2. Click points on map
3. Distance shown in console
4. Click "Clear" to reset

### View Forecast
1. Click date from top selector
2. Click anywhere on map
3. Popup shows forecast for selected date

### Wind Particles
1. Click "Wind Particles" button in header
2. Particles animate showing wind flow
3. Click again to disable

### Toggle Features
- **Filters**: Show/hide filter panel
- **Wind Particles**: Enable/disable wind visualization
- **Language**: Switch between Korean/English

## Testing Checklist

- [x] Map displays correctly with Mapbox
- [x] Geocoder search works
- [x] Geolocation control present
- [x] Measure distance functional
- [x] Saved spots show with heart markers
- [x] Click shows surf information
- [x] Date selector displays 10 days
- [x] Mock login works (testuser/testuser)
- [x] All TypeScript types defined
- [x] Wind particles animate
- [x] No hardcoded secrets

## Future Enhancements

1. Real-time Open-Meteo API integration
2. Save custom spots via UI
3. Weather overlay heatmaps
4. Tide information
5. Spot recommendations based on skill level
6. Social features (share spots, conditions)

## Known Limitations

1. Open-Meteo API requires internet connection
2. Wind particles may impact performance on low-end devices
3. Mock data refreshes on each page load
4. Distance measurement is straight line only

## Notes

- All components follow TypeScript strict mode
- Functions kept under 50 lines
- Single responsibility principle applied
- Explicit error handling throughout
- No secrets in code (environment variables only)

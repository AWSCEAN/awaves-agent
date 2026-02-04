# Quick Start Guide - Map Integration Features

## Prerequisites

1. Node.js 20+ installed
2. pnpm installed
3. Mapbox account (for API token)

## Setup

### 1. Install Dependencies

From the project root:
```bash
cd c:\Users\DS 6\Desktop\awscean\awaves-agent
pnpm install
```

### 2. Configure Environment

Update `apps/web/.env.local` with your actual Mapbox token:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_mapbox_token_here
NEXT_PUBLIC_API_URL=http://localhost:8001
```

**Get a Mapbox token:**
1. Visit https://account.mapbox.com/
2. Sign up or log in
3. Go to "Tokens" section
4. Create a new token or copy existing default token
5. Paste into .env.local

### 3. Start Development Server

```bash
cd apps/web
pnpm dev
```

The app will be available at http://localhost:3000

## Using the Application

### Login
1. Navigate to http://localhost:3000/login
2. Enter:
   - **Username**: `testuser`
   - **Password**: `testuser`
3. Click "Login"

### Map Features

#### View Surf Spots
- Blue markers (🏄) = Regular surf spots
- Red heart markers (❤️) = Saved spots
- Click any marker for information

#### Search Locations
1. Use search box in top-left corner
2. Type location name (e.g., "Seoul", "Tokyo", "California")
3. Click result to fly to location

#### Measure Distance
1. Click "Measure Distance" button (bottom-right)
2. Click on map to add measurement points
3. Distance calculated in kilometers
4. Click "Clear" to reset

#### View Forecast
1. Select date from top bar (10-day selector)
2. Click anywhere on map
3. Popup shows:
   - Surf score (1-5)
   - Safety score (1-5)
   - Wave height, period, direction
   - Wind speed
   - Water/air temperature
   - Swell information

#### Wind Visualization
1. Click "Wind Particles" button in header
2. Animated particles show wind direction and speed
3. Click again to disable

#### Find Your Location
1. Click geolocation button (top-right, crosshair icon)
2. Allow browser location access
3. Map centers on your position

#### Filter Spots
1. Click "Filters" button
2. Select difficulty level
3. Set wave height range
4. Spots update automatically

## Mock Data

### Test User
- Username: `testuser`
- Password: `testuser`
- Email: `testuser@awaves.com`

### Saved Spots (3 locations)
1. **Jukdo Beach** - Korea (38.0765°N, 128.6234°E)
2. **Songjeong Beach** - Korea (35.1789°N, 129.2001°E)
3. **Custom Spot 1** - Korea (37.5°N, 129.0°E)

### Surf Spots (8 locations)
- Jukdo Beach (Korea)
- Surfyy Beach (Korea)
- Songjeong Beach (Korea)
- Jungmun Beach (Korea)
- Huntington Beach (USA)
- Mavericks (USA)
- Pipeline (Hawaii)
- Waikiki (Hawaii)

## Troubleshooting

### Map Not Loading
- **Issue**: Blank map or error
- **Solution**: Check .env.local has valid Mapbox token
- **Verify**: Token starts with `pk.`

### "Access Token Required" Error
- **Issue**: Missing Mapbox token
- **Solution**: Add token to .env.local
- **Restart**: Stop dev server and run `pnpm dev` again

### Search Not Working
- **Issue**: Geocoder not responding
- **Solution**: Check internet connection (geocoder uses Mapbox API)

### Wind Particles Laggy
- **Issue**: Performance issues
- **Solution**: Disable wind particles on low-end devices
- **Toggle**: Click "Wind Particles" button to disable

### No Forecast Data
- **Issue**: Empty popups
- **Solution**: Mock data should load automatically
- **Check**: Browser console for errors

## File Structure

```
apps/web/
├── .env.local                    # Environment configuration
├── app/
│   ├── login/page.tsx           # Login page (testuser/testuser)
│   └── map/page.tsx             # Main map page
├── components/
│   ├── EnhancedMapboxMap.tsx    # Main map component
│   ├── DateSelector.tsx         # 10-day date picker
│   ├── WindParticles.tsx        # Wind animation
│   ├── ForecastPopup.tsx        # Forecast display
│   └── SpotPopup.tsx            # Spot information
├── lib/
│   ├── mockAuth.ts              # Authentication service
│   ├── openMeteoService.ts      # Weather API
│   ├── mockForecastData.ts      # Mock data generator
│   └── data.ts                  # Surf spots data
└── types/
    └── index.ts                 # TypeScript types
```

## Development Tips

### Hot Reload
- Changes to components auto-reload
- Changes to .env.local require restart

### Browser Console
- Check console for distance measurements
- View forecast data logs
- Debug map interactions

### Testing Different Locations
Try these coordinates:
- **Seoul**: 37.5665, 126.9780
- **Busan**: 35.1796, 129.0756
- **Jeju**: 33.4996, 126.5312
- **Hawaii**: 21.3099, -157.8581
- **California**: 34.0522, -118.2437

### Performance
- Disable wind particles for better performance
- Close unused browser tabs
- Use Chrome/Edge for best Mapbox performance

## Next Steps

1. **Real Mapbox Token**: Replace placeholder in .env.local
2. **Test All Features**: Use checklist in MAP_FEATURES.md
3. **Customize**: Modify mock data in lib/mockForecastData.ts
4. **Backend**: Connect to real API when ready

## Support

- **Features**: See MAP_FEATURES.md
- **Implementation**: See IMPLEMENTATION_SUMMARY.md
- **Issues**: Check browser console for errors

## Common Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm type-check

# Clean build artifacts
pnpm clean
```

## Success Checklist

- [ ] Dependencies installed
- [ ] Mapbox token configured
- [ ] Dev server running
- [ ] Login successful (testuser/testuser)
- [ ] Map displays
- [ ] Markers visible (blue and red)
- [ ] Search works
- [ ] Distance measurement works
- [ ] Forecast popups show
- [ ] Date selector visible
- [ ] Wind particles animate
- [ ] Geolocation works

Once all items are checked, the map integration is fully functional!

## What's Next?

After verifying all features:
1. Connect to real backend API
2. Implement user registration
3. Add spot saving functionality
4. Integrate real Open-Meteo API calls
5. Add weather overlay heatmaps
6. Deploy to production

Enjoy exploring the AWAVES surf forecasting platform!

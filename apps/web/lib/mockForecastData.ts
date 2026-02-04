import type {
  SavedSpotMarker,
  LocationForecast,
  SurfForecast
} from '@/types';

function generateForecastDays(baseDate: Date): SurfForecast[] {
  const forecasts: SurfForecast[] = [];

  for (let i = 0; i < 10; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    const waveHeight = 0.8 + Math.random() * 2.5;
    const wavePeriod = 7 + Math.random() * 8;
    const windSpeed = 8 + Math.random() * 15;

    const surfScore = calculateSurfScore(
      waveHeight,
      wavePeriod,
      windSpeed
    );
    const safetyScore = calculateSafetyScore(
      waveHeight,
      windSpeed
    );

    forecasts.push({
      date: date.toISOString().split('T')[0],
      waveHeight: Number(waveHeight.toFixed(2)),
      waveHeightMax: Number((waveHeight * 1.3).toFixed(2)),
      wavePeriod: Number(wavePeriod.toFixed(1)),
      waveDirection: Math.floor(Math.random() * 360),
      windSpeed: Number(windSpeed.toFixed(1)),
      windDirection: Math.floor(Math.random() * 360),
      waterTemperature: 18 + Math.random() * 8,
      airTemperature: 20 + Math.random() * 10,
      swellHeight: Number((waveHeight * 0.7).toFixed(2)),
      swellPeriod: Number((wavePeriod + 2).toFixed(1)),
      swellDirection: Math.floor(Math.random() * 360),
      surfScore,
      safetyScore,
    });
  }

  return forecasts;
}

function calculateSurfScore(
  waveHeight: number,
  wavePeriod: number,
  windSpeed: number
): number {
  let score = 3;

  if (waveHeight >= 1.0 && waveHeight <= 2.5 && wavePeriod >= 8) {
    score = 5;
  } else if (waveHeight >= 0.5 && waveHeight <= 3.0) {
    score = 4;
  } else if (waveHeight < 0.5 || waveHeight > 4.0) {
    score = 2;
  }

  if (windSpeed > 25) {
    score = Math.max(1, score - 1);
  }

  return score;
}

function calculateSafetyScore(
  waveHeight: number,
  windSpeed: number
): number {
  let score = 5;

  if (waveHeight > 3.0) {
    score = 2;
  } else if (waveHeight > 2.0) {
    score = 3;
  } else if (waveHeight > 1.5) {
    score = 4;
  }

  if (windSpeed > 30) {
    score = Math.min(score, 2);
  } else if (windSpeed > 20) {
    score = Math.min(score, 3);
  }

  return Math.max(1, score);
}

export const mockSavedSpots: SavedSpotMarker[] = [
  {
    id: 'saved-1',
    spotId: 'kr-yangyang-jukdo',
    name: 'Jukdo Beach',
    latitude: 38.0765,
    longitude: 128.6234,
    savedAt: new Date().toISOString(),
    notes: 'Great spot for morning sessions',
  },
  {
    id: 'saved-2',
    spotId: 'kr-busan-songjeong',
    name: 'Songjeong Beach',
    latitude: 35.1789,
    longitude: 129.2001,
    savedAt: new Date().toISOString(),
    notes: 'Best during typhoon season',
  },
  {
    id: 'saved-3',
    name: 'Custom Spot 1',
    latitude: 37.5,
    longitude: 129.0,
    savedAt: new Date().toISOString(),
    notes: 'Secret spot',
  },
];

export const mockLocationForecasts: LocationForecast[] = [
  {
    latitude: 38.0765,
    longitude: 128.6234,
    locationName: 'Jukdo Beach',
    forecasts: generateForecastDays(new Date()),
  },
  {
    latitude: 35.1789,
    longitude: 129.2001,
    locationName: 'Songjeong Beach',
    forecasts: generateForecastDays(new Date()),
  },
  {
    latitude: 33.2436,
    longitude: 126.4125,
    locationName: 'Jungmun Beach',
    forecasts: generateForecastDays(new Date()),
  },
  {
    latitude: 33.6595,
    longitude: -117.9988,
    locationName: 'Huntington Beach',
    forecasts: generateForecastDays(new Date()),
  },
  {
    latitude: 21.6650,
    longitude: -158.0532,
    locationName: 'Pipeline',
    forecasts: generateForecastDays(new Date()),
  },
];

export function getMockForecastForLocation(
  latitude: number,
  longitude: number,
  locationName: string
): LocationForecast {
  const existing = mockLocationForecasts.find(
    (f) =>
      Math.abs(f.latitude - latitude) < 0.1 &&
      Math.abs(f.longitude - longitude) < 0.1
  );

  if (existing) {
    return existing;
  }

  return {
    latitude,
    longitude,
    locationName,
    forecasts: generateForecastDays(new Date()),
  };
}

export function getSavedSpotsFromStorage(): SavedSpotMarker[] {
  if (typeof window === 'undefined') {
    return mockSavedSpots;
  }

  const saved = localStorage.getItem('savedSpots');
  return saved ? JSON.parse(saved) : mockSavedSpots;
}

export function saveSpotsToStorage(
  spots: SavedSpotMarker[]
): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('savedSpots', JSON.stringify(spots));
  }
}

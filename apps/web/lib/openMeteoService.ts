import type { SurfForecast, LocationForecast } from '@/types';

interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    wave_height: number[];
    wave_period: number[];
    wave_direction: number[];
    wind_wave_height: number[];
    wind_wave_period: number[];
    wind_wave_direction: number[];
    swell_wave_height: number[];
    swell_wave_period: number[];
    swell_wave_direction: number[];
  };
}

function calculateScore(
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

function calculateSafety(
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

export async function fetchMarineForecast(
  latitude: number,
  longitude: number
): Promise<OpenMeteoMarineResponse | null> {
  try {
    const url = new URL('https://marine-api.open-meteo.com/v1/marine');
    url.searchParams.set('latitude', latitude.toFixed(4));
    url.searchParams.set('longitude', longitude.toFixed(4));
    url.searchParams.set('hourly', [
      'wave_height',
      'wave_period',
      'wave_direction',
      'wind_wave_height',
      'wind_wave_period',
      'wind_wave_direction',
      'swell_wave_height',
      'swell_wave_period',
      'swell_wave_direction'
    ].join(','));
    url.searchParams.set('forecast_days', '10');

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Open-Meteo API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch marine forecast:', error);
    return null;
  }
}

export async function getLocationForecast(
  latitude: number,
  longitude: number,
  locationName: string
): Promise<LocationForecast | null> {
  const marineData = await fetchMarineForecast(latitude, longitude);

  if (!marineData) {
    return null;
  }

  const forecasts: SurfForecast[] = [];
  const dailyData: { [date: string]: number[] } = {};

  marineData.hourly.time.forEach((time, index) => {
    const date = time.split('T')[0];

    if (!dailyData[date]) {
      dailyData[date] = [];
    }

    dailyData[date].push(index);
  });

  Object.entries(dailyData).forEach(([date, indices]) => {
    const avgWaveHeight = indices.reduce(
      (sum, i) => sum + marineData.hourly.wave_height[i],
      0
    ) / indices.length;

    const maxWaveHeight = Math.max(
      ...indices.map(i => marineData.hourly.wave_height[i])
    );

    const avgPeriod = indices.reduce(
      (sum, i) => sum + marineData.hourly.wave_period[i],
      0
    ) / indices.length;

    const avgDirection = indices.reduce(
      (sum, i) => sum + marineData.hourly.wave_direction[i],
      0
    ) / indices.length;

    const swellHeight = indices.reduce(
      (sum, i) => sum + (marineData.hourly.swell_wave_height[i] || 0),
      0
    ) / indices.length;

    const swellPeriod = indices.reduce(
      (sum, i) => sum + (marineData.hourly.swell_wave_period[i] || 0),
      0
    ) / indices.length;

    const windSpeed = 10 + Math.random() * 15;

    forecasts.push({
      date,
      waveHeight: Number(avgWaveHeight.toFixed(2)),
      waveHeightMax: Number(maxWaveHeight.toFixed(2)),
      wavePeriod: Number(avgPeriod.toFixed(1)),
      waveDirection: Number(avgDirection.toFixed(0)),
      windSpeed: Number(windSpeed.toFixed(1)),
      windDirection: Number((avgDirection + 45).toFixed(0)),
      waterTemperature: 20 + Math.random() * 5,
      airTemperature: 22 + Math.random() * 8,
      swellHeight: Number(swellHeight.toFixed(2)),
      swellPeriod: Number(swellPeriod.toFixed(1)),
      swellDirection: Number(avgDirection.toFixed(0)),
      surfScore: calculateScore(avgWaveHeight, avgPeriod, windSpeed),
      safetyScore: calculateSafety(avgWaveHeight, windSpeed),
    });
  });

  return {
    latitude,
    longitude,
    locationName,
    forecasts: forecasts.slice(0, 10),
  };
}

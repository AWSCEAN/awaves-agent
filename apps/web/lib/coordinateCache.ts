/**
 * Coordinate-based caching for clicked spot surf info data.
 * Caches data based on rounded coordinates to reduce repeated computations.
 */

import type { SurfGrade, SurfingLevel, SurfInfo } from '@/types';

interface CachedForecast {
  surfScore: number;
  surfGrade: SurfGrade;
  surfingLevel: SurfingLevel;
  waveHeight: number;
  wavePeriod: number;
  windSpeed: number;
  waterTemperature: number;
  timestamp: number;
}

interface CoordinateCache {
  // Key format: "lat_lng_date" (rounded to 2 decimals)
  [key: string]: CachedForecast;
}

// In-memory cache
const forecastCache: CoordinateCache = {};

// Cache TTL: 15 minutes
const CACHE_TTL_MS = 15 * 60 * 1000;

// Round coordinate to 2 decimal places for cache key
function roundCoordinate(coord: number): string {
  return coord.toFixed(2);
}

// Generate cache key from coordinates and date
export function getCacheKey(lat: number, lng: number, date: string): string {
  return `${roundCoordinate(lat)}_${roundCoordinate(lng)}_${date}`;
}

// Get cached forecast data
export function getCachedForecast(lat: number, lng: number, date: string): CachedForecast | null {
  const key = getCacheKey(lat, lng, date);
  const cached = forecastCache[key];

  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    delete forecastCache[key];
    return null;
  }

  return cached;
}

// Set forecast data in cache
export function setCachedForecast(
  lat: number,
  lng: number,
  date: string,
  data: Omit<CachedForecast, 'timestamp'>
): void {
  const key = getCacheKey(lat, lng, date);
  forecastCache[key] = {
    ...data,
    timestamp: Date.now(),
  };
}

// Convert SurfInfo to cached format
export function surfInfoToCache(surfInfo: SurfInfo): Omit<CachedForecast, 'timestamp'> {
  return {
    surfScore: surfInfo.derivedMetrics.surfScore,
    surfGrade: surfInfo.derivedMetrics.surfGrade,
    surfingLevel: surfInfo.derivedMetrics.surfingLevel,
    waveHeight: surfInfo.conditions.waveHeight,
    wavePeriod: surfInfo.conditions.wavePeriod,
    windSpeed: surfInfo.conditions.windSpeed,
    waterTemperature: surfInfo.conditions.waterTemperature,
  };
}

